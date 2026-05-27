const { customAlphabet } = require("nanoid");

const Question = require("../models/Question");
const Result = require("../models/Result");
const TestAttempt = require("../models/TestAttempt");

const VALID_DIFFICULTY_LEVELS = ["easy", "medium", "hard"];
const VALID_TEST_MODES = ["common", "adaptive"];
const VALID_SET_TYPES = ["common", "easy", "medium", "hard"];
const MAX_QUESTIONS_PER_SET = 100;
const MAX_TOTAL_QUESTIONS_PER_TEST = 250;

// Shared in classrooms, so the alphabet avoids ambiguous characters like 0/O and 1/I.
const generateRoomCode = customAlphabet("ABCDEFGHJKLMNPQRSTUVWXYZ23456789", 6);

const emptyQuestionGroups = () => ({
  common: [],
  easy: [],
  medium: [],
  hard: [],
});

const normalizeSetType = (mode, rawSetType) => {
  const setType = rawSetType || (mode === "common" ? "common" : null);

  if (!setType || !VALID_SET_TYPES.includes(setType)) {
    return null;
  }

  if (mode === "common" && setType !== "common") {
    return null;
  }

  if (mode === "adaptive" && setType === "common") {
    return null;
  }

  return setType;
};

const groupQuestionsBySet = (questions) =>
  questions.reduce((groups, question) => {
    groups[question.setType].push(question);
    return groups;
  }, emptyQuestionGroups());

const getAssignedSetForStudent = async (test, studentId) => {
  if (test.mode === "common") {
    return "common";
  }

  try {
    // Adaptive banding rules:
    // 1) Use student's previous tests of the same subject (up to latest 5).
    // 2) If none exist, use student's overall latest 5 tests.
    // 3) If no history exists at all, start from baseline band.
    const subjectResults = await Result.find({
      studentId,
      subject: test.subject,
    })
      .sort({ submittedAt: -1 })
      .limit(5)
      .select("accuracy")
      .lean();

    const historyToUse =
      subjectResults.length > 0
        ? subjectResults
        : await Result.find({
            studentId,
          })
            .sort({ submittedAt: -1 })
            .limit(5)
            .select("accuracy")
            .lean();

    if (historyToUse.length === 0) {
      // "Common" starting behavior for first-time adaptive candidates maps to medium,
      // because adaptive tests are divided into easy/medium/hard sets only.
      return "medium";
    }

    const averageAccuracy =
      historyToUse.reduce((sum, item) => sum + Number(item.accuracy || 0), 0) / historyToUse.length;

    if (averageAccuracy >= 75) {
      return "hard";
    }

    if (averageAccuracy >= 45) {
      return "medium";
    }

    return "easy";
  } catch (error) {
    console.warn(
      `[adaptive-band] failed to evaluate last 5 results for student=${studentId}. Falling back to medium.`
    );
    return "medium";
  }
};

const loadQuestionsForSet = (testId, setType, institutionId = null) =>
  Question.find({
    testId,
    ...(institutionId ? { institutionId } : {}),
    setType,
  }).sort({ createdAt: 1 });

const calculateAttemptExpiry = (durationInMinutes) =>
  new Date(Date.now() + Number(durationInMinutes) * 60 * 1000);

const calculateRoomCodeExpiry = (publishedAt, durationInMinutes) =>
  new Date(new Date(publishedAt).getTime() + Number(durationInMinutes) * 60 * 1000);

const expireStaleAttempts = async (studentId, testId) => {
  await TestAttempt.updateOne(
    {
      studentId,
      testId,
      status: "in_progress",
      expiresAt: { $lte: new Date() },
    },
    {
      $set: {
        status: "expired",
      },
    }
  );
};

const normalizeQuestion = (question) => {
  if (!question || typeof question !== "object") {
    return { error: "Each question must be a valid object" };
  }

  const {
    questionText,
    options,
    correctAnswer,
    marks,
    difficultyLevel,
    topic,
    type,
    source,
    isEdited,
  } = question;

  if (!questionText || !correctAnswer) {
    return { error: "questionText and correctAnswer are required for every question" };
  }

  if (!Array.isArray(options) || options.length < 2) {
    return { error: "Each MCQ must include at least 2 options" };
  }

  if (!options.includes(correctAnswer)) {
    return { error: "correctAnswer must match one of the provided options" };
  }

  if (difficultyLevel && !VALID_DIFFICULTY_LEVELS.includes(difficultyLevel)) {
    return { error: "Question difficultyLevel must be easy, medium, or hard" };
  }

  return {
    value: {
      questionText,
      options,
      correctAnswer,
      marks: Number.isFinite(Number(marks)) && Number(marks) > 0 ? Number(marks) : 1,
      difficultyLevel: difficultyLevel || "medium",
      topic: topic || "",
      type: type || "mcq",
      source: source || "manual",
      isEdited: Boolean(isEdited),
    },
  };
};

const normalizeQuestionList = (questions) => {
  const normalizedQuestions = [];

  for (const question of questions) {
    const normalized = normalizeQuestion(question);
    if (normalized.error) {
      return { error: normalized.error };
    }
    normalizedQuestions.push(normalized.value);
  }

  return { value: normalizedQuestions };
};

const normalizeQuestionSets = (mode, sets) => {
  const normalizedSets = emptyQuestionGroups();

  if (sets === undefined) {
    return { value: normalizedSets };
  }

  if (!sets || typeof sets !== "object" || Array.isArray(sets)) {
    return { error: "sets must be an object" };
  }

  // Common-mode exposes one shared paper; adaptive-mode exposes exactly one banded paper.
  const allowedKeys = mode === "common" ? ["common"] : ["easy", "medium", "hard"];

  for (const key of Object.keys(sets)) {
    if (!allowedKeys.includes(key)) {
      return {
        error:
          mode === "common"
            ? "Common mode accepts only a common set"
            : "Adaptive mode accepts only easy, medium, and hard sets",
      };
    }
  }

  for (const setName of allowedKeys) {
    const rawQuestions = sets[setName] || [];

    if (!Array.isArray(rawQuestions)) {
      return { error: `${setName} set must be an array of questions` };
    }

    if (rawQuestions.length > MAX_QUESTIONS_PER_SET) {
      return {
        error: `${setName} set cannot contain more than ${MAX_QUESTIONS_PER_SET} questions`,
      };
    }

    const normalized = normalizeQuestionList(rawQuestions);
    if (normalized.error) {
      return { error: `${setName} set: ${normalized.error}` };
    }

    normalizedSets[setName] = normalized.value;
  }

  const totalQuestionCount = Object.values(normalizedSets).reduce(
    (sum, questions) => sum + questions.length,
    0
  );

  if (totalQuestionCount > MAX_TOTAL_QUESTIONS_PER_TEST) {
    return {
      error: `A test cannot contain more than ${MAX_TOTAL_QUESTIONS_PER_TEST} questions in total`,
    };
  }

  return { value: normalizedSets };
};

const replaceTestQuestions = async (testId, normalizedSets, session, institutionId = null) => {
  // Draft updates replace the entire stored paper so frontend can send the confirmed final version once.
  await Question.deleteMany({ testId, ...(institutionId ? { institutionId } : {}) }, { session });

  const questionDocuments = VALID_SET_TYPES.flatMap((setType) =>
    (normalizedSets[setType] || []).map((question) => ({
      ...question,
      testId,
      ...(institutionId ? { institutionId } : {}),
      setType,
    }))
  );

  if (questionDocuments.length === 0) {
    return emptyQuestionGroups();
  }

  const insertedQuestions = await Question.insertMany(questionDocuments, { session });
  return groupQuestionsBySet(insertedQuestions);
};

const isTransactionUnsupportedError = (error) =>
  typeof error?.message === "string" &&
  error.message.includes("Transaction numbers are only allowed on a replica set member or mongos");

const resolveStudentAttemptEntry = async (test, studentId) => {
  const assignedSet = await getAssignedSetForStudent(test, studentId);

  // Before deciding whether a student can continue, convert timed-out attempts into a terminal state.
  await expireStaleAttempts(studentId, test._id);

  const existingAttemptRecord = await TestAttempt.findOne({
    studentId,
    testId: test._id,
  });

  if (existingAttemptRecord?.status === "submitted") {
    return {
      error: {
        status: 409,
        message: "You have already submitted this test",
      },
    };
  }

  if (existingAttemptRecord?.status === "expired") {
    return {
      error: {
        status: 410,
        message: "Your attempt for this test has expired and you cannot reattempt it",
      },
    };
  }

  const questions = await loadQuestionsForSet(test._id, assignedSet, test.institutionId);

  if (questions.length === 0) {
    return {
      error: {
        status: 400,
        message: "No questions are configured for the assigned test set",
      },
    };
  }

  if (existingAttemptRecord?.status === "in_progress" && existingAttemptRecord.expiresAt > new Date()) {
    return {
      attempt: existingAttemptRecord,
      questions,
      assignedSet,
      reused: true,
    };
  }

  try {
    // One student gets exactly one attempt record for a test; if start is clicked twice we reuse it.
    const attempt = await TestAttempt.create({
      studentId,
      institutionId: test.institutionId || null,
      testId: test._id,
      assignedSet,
      roomCodeSnapshot: test.roomCode,
      expiresAt: calculateAttemptExpiry(test.duration),
    });

    return {
      attempt,
      questions,
      assignedSet,
      reused: false,
    };
  } catch (error) {
    if (error?.code === 11000) {
      // Handles a start-button race where two requests arrive before the UI knows the first succeeded.
      const concurrentAttempt = await TestAttempt.findOne({
        studentId,
        testId: test._id,
      });

      if (concurrentAttempt?.status === "in_progress" && concurrentAttempt.expiresAt > new Date()) {
        return {
          attempt: concurrentAttempt,
          questions,
          assignedSet,
          reused: true,
        };
      }
    }

    throw error;
  }
};

module.exports = {
  VALID_TEST_MODES,
  VALID_SET_TYPES,
  MAX_QUESTIONS_PER_SET,
  MAX_TOTAL_QUESTIONS_PER_TEST,
  generateRoomCode,
  normalizeSetType,
  groupQuestionsBySet,
  getAssignedSetForStudent,
  loadQuestionsForSet,
  calculateAttemptExpiry,
  calculateRoomCodeExpiry,
  expireStaleAttempts,
  normalizeQuestion,
  normalizeQuestionSets,
  replaceTestQuestions,
  resolveStudentAttemptEntry,
  isTransactionUnsupportedError,
};
