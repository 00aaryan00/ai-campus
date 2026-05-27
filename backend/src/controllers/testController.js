const mongoose = require("mongoose");

const Question = require("../models/Question");
const Test = require("../models/Test");
const TestAttempt = require("../models/TestAttempt");
const {
  buildTestLobbyPayload,
  buildStudentTestPayload,
  buildFacultyTestPayload,
} = require("../utils/testPayload");
const {
  VALID_TEST_MODES,
  MAX_QUESTIONS_PER_SET,
  MAX_TOTAL_QUESTIONS_PER_TEST,
  generateRoomCode,
  normalizeSetType,
  groupQuestionsBySet,
  getAssignedSetForStudent,
  loadQuestionsForSet,
  calculateRoomCodeExpiry,
  expireStaleAttempts,
  normalizeQuestion,
  normalizeQuestionSets,
  replaceTestQuestions,
  resolveStudentAttemptEntry,
  isTransactionUnsupportedError,
} = require("../utils/testFlow");

const loadFacultyTestView = async (test) => {
  const questions = await Question.find({ testId: test._id }).sort({ createdAt: 1 });
  return buildFacultyTestPayload(test, groupQuestionsBySet(questions));
};

const normalizeDepartment = (value) => String(value || "").trim().toLowerCase();

const getTestDepartment = (test) =>
  normalizeDepartment(test?.department || test?.createdBy?.department);

const createTestWithSets = async (testData, normalizedSets, useTransaction = true) => {
  let session;

  try {
    if (useTransaction) {
      session = await mongoose.startSession();
      session.startTransaction();
      console.log("[txn] create-test using transaction");
    }

    const createOptions = session ? { session } : undefined;
    const [test] = await Test.create([testData], createOptions);
    const groupedQuestions = await replaceTestQuestions(
      test._id,
      normalizedSets,
      session,
      testData.institutionId || null
    );

    if (session) {
      await session.commitTransaction();
      session.endSession();
    }

    return {
      test,
      groupedQuestions,
    };
  } catch (error) {
    if (session) {
      await session.abortTransaction();
      session.endSession();
    }

    //** IMP- Local standalone Mongo does not support transactions, so dev falls back to non-transactional writes.
    if (useTransaction && isTransactionUnsupportedError(error)) {
      return createTestWithSets(testData, normalizedSets, false);
    }

    throw error;
  }
};

const updateDraftWithSets = async (test, normalizedSets, useTransaction = true) => {
  let session;

  try {
    if (useTransaction) {
      session = await mongoose.startSession();
      session.startTransaction();
      console.log("[txn] update-draft using transaction");
    }

    if (session) {
      await test.save({ session });
    } else {
      await test.save();
    }

    const groupedQuestions =
      normalizedSets !== undefined
        ? await replaceTestQuestions(test._id, normalizedSets, session, test.institutionId || null)
        : groupQuestionsBySet(
            await Question.find({ testId: test._id }).sort({ createdAt: 1 }).session(session || null)
          );

    if (session) {
      await session.commitTransaction();
      session.endSession();
    }

    return groupedQuestions;
  } catch (error) {
    if (session) {
      await session.abortTransaction();
      session.endSession();
    }

    if (useTransaction && isTransactionUnsupportedError(error)) {
      return updateDraftWithSets(test, normalizedSets, false);
    }

    throw error;
  }
};

const createTest = async (req, res, next) => {
  try {
    if (!req.tenant?._id) {
      return res.status(400).json({
        success: false,
        message: "Tenant context is required",
      });
    }

    const { title, subject, mode, duration, instructions, sets } = req.body;
    const facultyDepartment = normalizeDepartment(req.user.department);

    if (!facultyDepartment) {
      return res.status(400).json({
        success: false,
        message: "Faculty department is required to create a test",
      });
    }

    if (!title || !subject || !duration) {
      return res.status(400).json({
        success: false,
        message: "title, subject, and duration are required",
      });
    }

    if (mode && !VALID_TEST_MODES.includes(mode)) {
      return res.status(400).json({
        success: false,
        message: "mode must be common or adaptive",
      });
    }

    const numericDuration = Number(duration);
    if (!Number.isFinite(numericDuration) || numericDuration <= 0) {
      return res.status(400).json({
        success: false,
        message: "duration must be a positive number",
      });
    }

    const normalizedMode = mode || "common";
    const normalizedSets = normalizeQuestionSets(normalizedMode, sets);

    if (normalizedSets.error) {
      return res.status(400).json({
        success: false,
        message: normalizedSets.error,
      });
    }

    // "Create" means publish immediately, so the question sets must already be final and complete.
    const isPublishable =
      normalizedMode === "common"
        ? normalizedSets.value.common.length > 0
        : normalizedSets.value.easy.length > 0 &&
          normalizedSets.value.medium.length > 0 &&
          normalizedSets.value.hard.length > 0;

    if (!isPublishable) {
      return res.status(400).json({
        success: false,
        message:
          normalizedMode === "common"
            ? "Published common-mode tests must include at least one common-set question"
            : "Published adaptive-mode tests must include at least one question in easy, medium, and hard sets",
      });
    }

    const roomCode = generateRoomCode();
    const publishedAt = new Date();
    const { test, groupedQuestions } = await createTestWithSets(
      {
        title,
        subject,
        mode: normalizedMode,
        duration: numericDuration,
        institutionId: req.tenant._id,
        department: facultyDepartment,
        instructions,
        createdBy: req.user._id,
        status: "published",
        roomCode,
        publishedAt,
        roomCodeExpiresAt: calculateRoomCodeExpiry(publishedAt, numericDuration),
      },
      normalizedSets.value
    );

    return res.status(201).json({
      success: true,
      message: "Test created successfully",
      test: buildFacultyTestPayload(test, groupedQuestions),
    });
  } catch (error) {
    next(error);
  }
};

const saveDraftTest = async (req, res, next) => {
  try {
    if (!req.tenant?._id) {
      return res.status(400).json({
        success: false,
        message: "Tenant context is required",
      });
    }

    const { title, subject, mode, duration, instructions, sets } = req.body;

    if (!title || !subject || !duration) {
      return res.status(400).json({
        success: false,
        message: "title, subject, and duration are required",
      });
    }

    if (mode && !VALID_TEST_MODES.includes(mode)) {
      return res.status(400).json({
        success: false,
        message: "mode must be common or adaptive",
      });
    }

    const numericDuration = Number(duration);
    if (!Number.isFinite(numericDuration) || numericDuration <= 0) {
      return res.status(400).json({
        success: false,
        message: "duration must be a positive number",
      });
    }

    const normalizedMode = mode || "common";
    const normalizedSets = normalizeQuestionSets(normalizedMode, sets);

    if (normalizedSets.error) {
      return res.status(400).json({
        success: false,
        message: normalizedSets.error,
      });
    }

    // Drafts persist the final structure without generating a room code yet.
    const { test, groupedQuestions } = await createTestWithSets(
      {
        title,
        subject,
        mode: normalizedMode,
        duration: numericDuration,
        institutionId: req.tenant._id,
        instructions,
        createdBy: req.user._id,
        status: "draft",
        roomCode: null,
        publishedAt: null,
        roomCodeExpiresAt: null,
      },
      normalizedSets.value
    );

    return res.status(201).json({
      success: true,
      message: "Draft test saved successfully",
      test: buildFacultyTestPayload(test, groupedQuestions),
    });
  } catch (error) {
    next(error);
  }
};

const updateTestDraft = async (req, res, next) => {
  try {
    if (!req.tenant?._id) {
      return res.status(400).json({
        success: false,
        message: "Tenant context is required",
      });
    }

    const { id } = req.params;
    const { title, subject, mode, duration, instructions, sets } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid test id",
      });
    }

    const test = await Test.findOne({
      _id: id,
      institutionId: req.tenant._id,
    });

    if (!test) {
      return res.status(404).json({
        success: false,
        message: "Test not found",
      });
    }

    if (String(test.createdBy) !== String(req.user._id)) {
      return res.status(403).json({
        success: false,
        message: "You can only update tests created by you",
      });
    }

    if (test.status !== "draft") {
      return res.status(400).json({
        success: false,
        message: "Only draft tests can be updated",
      });
    }

    const nextMode = mode || test.mode;
    if (!VALID_TEST_MODES.includes(nextMode)) {
      return res.status(400).json({
        success: false,
        message: "mode must be common or adaptive",
      });
    }

    const normalizedSets = normalizeQuestionSets(nextMode, sets);
    if (normalizedSets.error) {
      return res.status(400).json({
        success: false,
        message: normalizedSets.error,
      });
    }

    if (duration !== undefined) {
      const numericDuration = Number(duration);
      if (!Number.isFinite(numericDuration) || numericDuration <= 0) {
        return res.status(400).json({
          success: false,
          message: "duration must be a positive number",
        });
      }
      test.duration = numericDuration;
    }

    if (title !== undefined) {
      if (!title.trim()) {
        return res.status(400).json({
          success: false,
          message: "title cannot be empty",
        });
      }
      test.title = title;
    }

    if (subject !== undefined) {
      if (!subject.trim()) {
        return res.status(400).json({
          success: false,
          message: "subject cannot be empty",
        });
      }
      test.subject = subject;
    }

    if (instructions !== undefined) {
      test.instructions = instructions;
    }

    test.mode = nextMode;
    const groupedQuestions = await updateDraftWithSets(
      test,
      sets !== undefined ? normalizedSets.value : undefined
    );

    return res.status(200).json({
      success: true,
      message: "Draft test updated successfully",
      test: buildFacultyTestPayload(test, groupedQuestions),
    });
  } catch (error) {
    next(error);
  }
};





const joinTestByCode = async (req, res, next) => {
  try {
    if (!req.tenant?._id) {
      return res.status(400).json({
        success: false,
        message: "Tenant context is required",
      });
    }

    const { roomCode } = req.body;

    if (!roomCode || typeof roomCode !== "string") {
      return res.status(400).json({
        success: false,
        message: "roomCode is required",
      });
    }

    const normalizedRoomCode = roomCode.trim().toUpperCase();

    const test = await Test.findOne({
      roomCode: normalizedRoomCode,
      status: "published",
      institutionId: req.tenant._id,
    }).populate("createdBy", "name email role department");

    if (!test) {
      return res.status(404).json({
        success: false,
        message: "No published test found for this room code",
      });
    }

    const testDepartment = getTestDepartment(test);
    const studentDepartment = normalizeDepartment(req.user.department);
    if (testDepartment && studentDepartment && testDepartment !== studentDepartment) {
      return res.status(403).json({
        success: false,
        message: "This test belongs to a different department",
      });
    }

    if (test.roomCodeExpiresAt && test.roomCodeExpiresAt <= new Date()) {
      return res.status(410).json({
        success: false,
        message: "This room code has expired",
      });
    }

    await expireStaleAttempts(req.user._id, test._id);

    const existingAttemptRecord = await TestAttempt.findOne({
      studentId: req.user._id,
      testId: test._id,
    });

    if (existingAttemptRecord?.status === "submitted") {
      return res.status(409).json({
        success: false,
        message: "You have already submitted this test",
      });
    }

    if (existingAttemptRecord?.status === "expired") {
      return res.status(410).json({
        success: false,
        message: "Your attempt for this test has expired and you cannot reattempt it",
      });
    }

    const assignedSet = await getAssignedSetForStudent(test, req.user._id);
    const questions = await loadQuestionsForSet(test._id, assignedSet, req.tenant._id);

    if (questions.length === 0) {
      return res.status(400).json({
        success: false,
        message: "No questions are configured for the assigned test set",
      });
    }

    // Lobby response intentionally excludes question content; questions are released only after Start.
    const resumableAttempt =
      existingAttemptRecord?.status === "in_progress" && existingAttemptRecord.expiresAt > new Date()
        ? existingAttemptRecord
        : null;

    return res.status(200).json({
      success: true,
      message: resumableAttempt ? "Test lobby loaded with resumable attempt" : "Test lobby loaded",
      resumableAttempt: resumableAttempt || null,
      test: buildTestLobbyPayload(test, assignedSet, questions),
    });
  } catch (error) {
    next(error);
  }
};

const startTest = async (req, res, next) => {
  try {
    if (!req.tenant?._id) {
      return res.status(400).json({
        success: false,
        message: "Tenant context is required",
      });
    }

    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid test id",
      });
    }

    const test = await Test.findOne({
      _id: id,
      institutionId: req.tenant._id,
    }).populate("createdBy", "name email role department");

    if (!test) {
      return res.status(404).json({
        success: false,
        message: "Test not found",
      });
    }

    const testDepartment = getTestDepartment(test);
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
        message: "This test is not available to students yet",
      });
    }

    if (test.roomCodeExpiresAt && test.roomCodeExpiresAt <= new Date()) {
      return res.status(410).json({
        success: false,
        message: "This room code has expired",
      });
    }

    const { roomCode } = req.body || {};
    if (!roomCode || String(roomCode).trim().toUpperCase() !== test.roomCode) {
      return res.status(400).json({
        success: false,
        message: "Valid roomCode is required to start this test",
      });
    }

    // Starting is the moment an attempt is created/resumed and the assigned paper is revealed.
    const resolution = await resolveStudentAttemptEntry(test, req.user._id);

    if (resolution.error) {
      return res.status(resolution.error.status).json({
        success: false,
        message: resolution.error.message,
      });
    }

    return res.status(resolution.reused ? 200 : 201).json({
      success: true,
      message: resolution.reused ? "Existing attempt loaded" : "Test started successfully",
      attempt: resolution.attempt,
      test: buildStudentTestPayload(test, resolution.questions, resolution.assignedSet),
    });
  } catch (error) {
    next(error);
  }
};



const publishTest = async (req, res, next) => {
  try {
    if (!req.tenant?._id) {
      return res.status(400).json({
        success: false,
        message: "Tenant context is required",
      });
    }

    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid test id",
      });
    }

    const test = await Test.findOne({
      _id: id,
      institutionId: req.tenant._id,
    });

    if (!test) {
      return res.status(404).json({
        success: false,
        message: "Test not found",
      });
    }

    if (String(test.createdBy) !== String(req.user._id)) {
      return res.status(403).json({
        success: false,
        message: "You can only publish tests created by you",
      });
    }

    if (test.status !== "draft") {
      return res.status(400).json({
        success: false,
        message: "Only draft tests can be published",
      });
    }

    const questionCounts = await Question.aggregate([
      { $match: { testId: test._id } },
      { $group: { _id: "$setType", count: { $sum: 1 } } },
    ]);

    const countsBySet = questionCounts.reduce((accumulator, item) => {
      accumulator[item._id] = item.count;
      return accumulator;
    }, {});

    // Draft publish follows the same completeness rule as immediate create/publish.
    const isPublishable =
      test.mode === "common"
        ? (countsBySet.common || 0) > 0
        : (countsBySet.easy || 0) > 0 &&
          (countsBySet.medium || 0) > 0 &&
          (countsBySet.hard || 0) > 0;

    if (!isPublishable) {
      return res.status(400).json({
        success: false,
        message:
          test.mode === "common"
            ? "Add at least one common-set question before publishing the test"
            : "Add at least one question to easy, medium, and hard sets before publishing the test",
      });
    }

    test.status = "published";
    test.roomCode = generateRoomCode();
    test.publishedAt = new Date();
    test.roomCodeExpiresAt = calculateRoomCodeExpiry(test.publishedAt, test.duration);
    await test.save();

    return res.status(200).json({
      success: true,
      message: "Test published successfully",
      test,
    });
  } catch (error) {
    next(error);
  }
};

const buildNormalizedAiQuestion = (question, fallbackDifficulty = "medium") => {
  const optionValues = [
    question?.options?.A,
    question?.options?.B,
    question?.options?.C,
    question?.options?.D,
  ].filter((item) => typeof item === "string" && item.trim());

  const correctAnswer = question?.options?.[question?.correct_answer] || "";
  const allowedDifficulty = ["easy", "medium", "hard"];
  const difficulty = String(question?.difficulty || fallbackDifficulty).toLowerCase();

  return {
    questionText: question?.question || "",
    options: optionValues,
    correctAnswer,
    marks: Number.isFinite(Number(question?.marks)) ? Number(question.marks) : 1,
    difficultyLevel: allowedDifficulty.includes(difficulty) ? difficulty : fallbackDifficulty,
    topic: "",
    source: "ai",
  };
};

const generateQuestionsFromAI = async (req, res, next) => {
  try {
    const { transcript, mode = "same" } = req.body;

    if (!transcript || typeof transcript !== "string" || !transcript.trim()) {
      return res.status(400).json({
        success: false,
        message: "transcript is required",
      });
    }

    if (!["same", "adaptive"].includes(mode)) {
      return res.status(400).json({
        success: false,
        message: "mode must be either same or adaptive",
      });
    }

    const aiServiceUrl = process.env.AI_SERVICE_URL || "http://127.0.0.1:8001";
    const endpoint = mode === "same" ? "/generate-same-test" : "/generate-rankwise-test";
    const aiResponse = await fetch(`${aiServiceUrl}${endpoint}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        transcript,
      }),
    });

    if (!aiResponse.ok) {
      const errorPayload = await aiResponse.json().catch(() => ({}));
      return res.status(502).json({
        success: false,
        message: errorPayload?.detail || "AI service request failed",
      });
    }

    const aiPayload = await aiResponse.json();
    if (mode === "same") {
      return res.status(200).json({
        success: true,
        mode: "common",
        sets: {
          common: (aiPayload.questions || []).map((question) =>
            buildNormalizedAiQuestion(question, "medium")
          ),
        },
      });
    }

    return res.status(200).json({
      success: true,
      mode: "adaptive",
      sets: {
        easy: (aiPayload.easy || []).map((question) => buildNormalizedAiQuestion(question, "easy")),
        medium: (aiPayload.medium || []).map((question) =>
          buildNormalizedAiQuestion(question, "medium")
        ),
        hard: (aiPayload.hard || []).map((question) => buildNormalizedAiQuestion(question, "hard")),
      },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createTest,
  generateQuestionsFromAI,
  saveDraftTest,
  updateTestDraft,
  joinTestByCode,
  startTest,
  publishTest,
};
