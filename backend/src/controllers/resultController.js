const mongoose = require("mongoose");

const Question = require("../models/Question");
const Result = require("../models/Result");
const Test = require("../models/Test");
const TestAttempt = require("../models/TestAttempt");
const { analyticsQueue } = require("../queues/analyticsQueue");
const evaluateTest = require("../utils/evaluateTest");
const { isTransactionUnsupportedError } = require("../utils/testFlow");

const isDuplicateKeyError = (error) => error?.code === 11000;
const submitGraceSeconds = Math.max(Number(process.env.SUBMIT_GRACE_SECONDS || 15), 0);
const normalizeDepartment = (value) => String(value || "").trim().toLowerCase();

const findAttemptResult = (attemptId, session) =>
  Result.findOne({ attemptId }).session(session || null);

const createResultRecord = async (payload, session) => {
  const createOptions = session ? { session } : undefined;
  const [result] = await Result.create([payload], createOptions);
  return result;
};

const markAttemptExpired = (attemptId, now, session) =>
  TestAttempt.findOneAndUpdate(
    {
      _id: attemptId,
      status: "in_progress",
      expiresAt: { $lte: now },
    },
    {
      $set: {
        status: "expired",
      },
    },
    {
      new: true,
      session: session || undefined,
    }
  );

const lockAttemptForSubmission = (attemptId, submittedAt, session) =>
  // Submission lock: allow both in_progress and expired states to transition to submitted.
  // Expiry enforcement is handled by UI timer/flow; backend accepts final submit for existing attempt.
  TestAttempt.findOneAndUpdate(
    {
      _id: attemptId,
      status: { $in: ["in_progress", "expired"] },
    },
    {
      $set: {
        status: "submitted",
        submittedAt,
      },
    },
    {
      new: true,
      session: session || undefined,
    }
  );

const rollbackSubmittedAttempt = async (attemptId, submittedAt) => {
  await TestAttempt.updateOne(
    {
      _id: attemptId,
      status: "submitted",
      submittedAt,
    },
    {
      $set: {
        status: "in_progress",
        submittedAt: null,
      },
    }
  );
};

const isWithinSubmissionWindow = (expiresAt, submittedAt) => {
  const expiryMs = new Date(expiresAt).getTime();
  const submittedMs = new Date(submittedAt).getTime();
  return submittedMs <= expiryMs + submitGraceSeconds * 1000;
};

const submitAttemptResult = async ({
  attemptId,
  studentId,
  institutionId,
  test,
  assignedSet,
  answers,
  useTransaction = true,
}) => {
  let session;

  try {
    if (useTransaction) {
      session = await mongoose.startSession();
      session.startTransaction();
      console.log("[txn] submit-result using transaction");
    }

    const currentAttempt = await TestAttempt.findById(attemptId).session(session || null);

    if (!currentAttempt) {
      if (session) {
        await session.abortTransaction();
        session.endSession();
      }

      return {
        error: {
          status: 400,
          message: "Start the test before submitting answers",
        },
      };
    }

    const existingResult = await findAttemptResult(currentAttempt._id, session);
    if (existingResult) {
      if (currentAttempt.status === "in_progress") {
        await TestAttempt.updateOne(
          { _id: currentAttempt._id, status: "in_progress" },
          {
            $set: {
              status: "submitted",
              submittedAt: existingResult.submittedAt || new Date(),
            },
          },
          { session: session || undefined }
        );
      }

      if (session) {
        await session.commitTransaction();
        session.endSession();
      }

      return {
        error: {
          status: 409,
          message: "This attempt has already been submitted",
        },
      };
    }

    if (currentAttempt.status === "submitted") {
      if (session) {
        await session.commitTransaction();
        session.endSession();
      }

      return {
        error: {
          status: 409,
          message: "This attempt has already been submitted",
        },
      };
    }

    const now = new Date();
    await markAttemptExpired(currentAttempt._id, now, session);

    // Submission is always evaluated against the set that was locked into the attempt at start time.
    const questions = await Question.find({
      institutionId: institutionId || null,
      testId: test._id,
      setType: assignedSet,
    })
      .sort({ createdAt: 1 })
      .session(session || null);

    if (questions.length === 0) {
      if (session) {
        await session.abortTransaction();
        session.endSession();
      }

      return {
        error: {
          status: 400,
          message: "No questions found for the assigned test set",
        },
      };
    }

    const evaluation = evaluateTest(questions, answers);
    const submittedAt = new Date();
    if (!isWithinSubmissionWindow(currentAttempt.expiresAt, submittedAt)) {
      if (session) {
        await session.commitTransaction();
        session.endSession();
      }

      return {
        error: {
          status: 410,
          message: "Submission window has closed for this attempt",
        },
      };
    }

    const lockedAttempt = await lockAttemptForSubmission(currentAttempt._id, submittedAt, session);
    if (!lockedAttempt) {
      const latestAttempt = await TestAttempt.findById(currentAttempt._id).session(session || null);
      const latestResult = await findAttemptResult(currentAttempt._id, session);

      if (latestResult || latestAttempt?.status === "submitted") {
        if (session) {
          await session.commitTransaction();
          session.endSession();
        }

        return {
          error: {
            status: 409,
            message: "This attempt has already been submitted",
          },
        };
      }

      if (latestAttempt && !isWithinSubmissionWindow(latestAttempt.expiresAt, submittedAt)) {
        if (session) {
          await session.commitTransaction();
          session.endSession();
        }
     
        return {
          error: {
            status: 410,
            message: "Submission window has closed for this attempt",
          },
        };
      }

      if (session) {
        await session.abortTransaction();
        session.endSession();
      }

      return {
        error: {
          status: 409,
          message: "This test can no longer be submitted",
        },
      };
    }

    const resultPayload = {
      studentId,
      institutionId,
      testId: test._id,
      attemptId: currentAttempt._id,
      subject: test.subject,
      assignedSet,
      answers: evaluation.answers,
      score: evaluation.score,
      totalMarks: evaluation.totalMarks,
      accuracy: evaluation.accuracy,
      submittedAt,
    };

    try {
      const result = await createResultRecord(resultPayload, session);

      if (session) {
        await session.commitTransaction();
        session.endSession();
      }

      return { result };
    } catch (error) {
      if (!session && !isDuplicateKeyError(error)) {
        // Standalone Mongo cannot make both writes atomic, so dev mode rolls back the state lock if result write fails.
        await rollbackSubmittedAttempt(currentAttempt._id, submittedAt);
      }

      throw error;
    }
  } catch (error) {
    if (session) {
      await session.abortTransaction();
      session.endSession();
    }

    if (useTransaction && isTransactionUnsupportedError(error)) {
      return submitAttemptResult({
        attemptId,
        studentId,
        test,
        assignedSet,
        answers,
        useTransaction: false,
      });
    }

    if (isDuplicateKeyError(error)) {
      return {
        error: {
          status: 409,
          message: "This attempt has already been submitted",
        },
      };
    }

    throw error;
  }
};

const submitTest = async (req, res, next) => {
  try {
    if (!req.tenant?._id) {
      return res.status(400).json({
        success: false,
        message: "Tenant context is required",
      });
    }

    const { testId, answers } = req.body;

    console.log("[submit] request received", {
      studentId: String(req.user._id),
      testId: testId || null,
      at: new Date().toISOString(),
    });

    if (!mongoose.Types.ObjectId.isValid(testId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid test id",
      });
    }

    if (!Array.isArray(answers)) {
      return res.status(400).json({
        success: false,
        message: "answers must be an array",
      });
    }

    for (const answer of answers) {
      if (!answer.questionId || typeof answer.selectedAnswer !== "string") {
        return res.status(400).json({
          success: false,
          message: "Each answer must include questionId and selectedAnswer",
        });
      }
    }

    const test = await Test.findOne({
      _id: testId,
      institutionId: req.tenant._id,
    }).populate("createdBy", "department");

    if (!test) {
      return res.status(404).json({
        success: false,
        message: "Test not found",
      });
    }

    const testDepartment = normalizeDepartment(test.department || test.createdBy?.department);
    const studentDepartment = normalizeDepartment(req.user.department);
    if (testDepartment && studentDepartment && testDepartment !== studentDepartment) {
      return res.status(403).json({
        success: false,
        message: "This test belongs to a different department",
      });
    }

    if (test.status !== "published") {
      return res.status(403).json({
        success: false,
        message: "This test is not available for submission",
      });
    }

    const attempt = await TestAttempt.findOne({
      studentId: req.user._id,
      testId,
    });

    if (!attempt) {
      return res.status(400).json({
        success: false,
        message: "Start the test before submitting answers",
      });
    }

    const submission = await submitAttemptResult({
      attemptId: attempt._id,
      studentId: req.user._id,
      institutionId: req.tenant._id,
      test,
      assignedSet: attempt.assignedSet,
      answers,
    });

    if (submission.error) {
      return res.status(submission.error.status).json({
        success: false,
        message: submission.error.message,
      });
    }

    // Analytics is intentionally async/background so operational submission latency stays low.
    // MongoDB write is already complete at this point; queue failure should not fail the API call.
    analyticsQueue
      .add("result-submitted", {
        resultId: String(submission.result._id),
      })
      .then((job) => {
        console.log(`[analytics-queue] enqueued result-submitted jobId=${job.id}`);
        // Ping background worker's health endpoint to wake it up safely
        const workerUrl = (process.env.WORKER_URL || "https://bgworkers-ai-campus.onrender.com").replace(/\/+$/, "");
        fetch(`${workerUrl}/api/health`)
          .catch((err) => console.log("[analytics-queue] worker wake-up ping failed:", err.message));
      })
      .catch((error) => {
        console.warn(
          `[analytics-queue] enqueue failed for resultId=${submission.result._id}: ${error.message}`
        );
      });

    return res.status(201).json({
      success: true,
      message: "Test submitted successfully",
      result: submission.result,
    });
  } catch (error) {
    next(error);
  }
};

const getMyResults = async (req, res, next) => {
  try {
    const results = await Result.find({
      studentId: req.user._id,
      institutionId: req.tenant?._id || req.user.institutionId,
    })
      .populate("testId", "title subject mode duration roomCode")
      .sort({ submittedAt: -1 });

    return res.status(200).json({
      success: true,
      count: results.length,
      results,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  submitTest,
  getMyResults,
};
