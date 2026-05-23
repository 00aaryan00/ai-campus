const mongoose = require("mongoose");
const { Worker } = require("bullmq");

const { createRedisConnection } = require("../config/redis");
const { mysqlPool } = require("../config/mysql");
const { ANALYTICS_QUEUE_NAME } = require("../queues/analyticsQueue");
const Question = require("../models/Question");
const Result = require("../models/Result");
const Test = require("../models/Test");
const User = require("../models/User");

const mapById = (items) => {
  const map = new Map();

  for (const item of items) {
    map.set(String(item._id), item);
  }

  return map;
};

const processResultSubmittedJob = async (job) => {
  const { resultId } = job.data;

  if (!mongoose.Types.ObjectId.isValid(resultId)) {
    throw new Error(`Invalid resultId received in analytics job: ${resultId}`);
  }

  const result = await Result.findById(resultId).lean();
  if (!result) {
    console.warn(`[analytics-worker] Result not found for resultId=${resultId}. Skipping.`);
    return;
  }

  const test = await Test.findById(result.testId).lean();
  const faculty = test?.createdBy ? await User.findById(test.createdBy).select("_id name department").lean() : null;
  const questionIds = result.answers.map((answer) => answer.questionId).filter(Boolean);

  const questions = questionIds.length
    ? await Question.find({ _id: { $in: questionIds } })
        .select("_id topic difficultyLevel")
        .lean()
    : [];

  const questionById = mapById(questions);

  // One row per submission for leaderboard/report/score trend analytics.
  await mysqlPool.execute(
    `INSERT INTO fact_student_test
     (result_id, student_id, test_id, faculty_id, faculty_department, faculty_name_snapshot, subject, score, total_marks, accuracy, assigned_set, submitted_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE
       student_id = VALUES(student_id),
       test_id = VALUES(test_id),
       faculty_id = VALUES(faculty_id),
       faculty_department = VALUES(faculty_department),
       faculty_name_snapshot = VALUES(faculty_name_snapshot),
       subject = VALUES(subject),
       score = VALUES(score),
       total_marks = VALUES(total_marks),
       accuracy = VALUES(accuracy),
       assigned_set = VALUES(assigned_set),
       submitted_at = VALUES(submitted_at)`,
    [
      String(result._id),
      String(result.studentId),
      String(result.testId),
      faculty?._id ? String(faculty._id) : null,
      faculty?.department || "",
      faculty?.name || "",
      result.subject || test?.subject || "",
      result.score || 0,
      result.totalMarks || 0,
      result.accuracy || 0,
      result.assignedSet || "",
      new Date(result.submittedAt),
    ]
  );

  const answersWithQuestion = result.answers.filter((answer) => answer.questionId);
  for (const answer of answersWithQuestion) {
    const question = questionById.get(String(answer.questionId));

    await mysqlPool.execute(
      `INSERT INTO fact_student_question
       (result_id, student_id, test_id, faculty_id, faculty_department, question_id, topic, difficulty, is_correct, selected_answer, assigned_set, submitted_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         student_id = VALUES(student_id),
         test_id = VALUES(test_id),
         faculty_id = VALUES(faculty_id),
         faculty_department = VALUES(faculty_department),
         topic = VALUES(topic),
         difficulty = VALUES(difficulty),
         is_correct = VALUES(is_correct),
         selected_answer = VALUES(selected_answer),
         assigned_set = VALUES(assigned_set),
         submitted_at = VALUES(submitted_at)`,
      [
        String(result._id),
        String(result.studentId),
        String(result.testId),
        faculty?._id ? String(faculty._id) : null,
        faculty?.department || "",
        String(answer.questionId),
        answer.topic || question?.topic || "",
        question?.difficultyLevel || "",
        answer.isCorrect ? 1 : 0,
        answer.selectedAnswer || "",
        result.assignedSet || "",
        new Date(result.submittedAt),
      ]
    );
  }

  console.log(
    `[analytics-worker] transformed result=${result._id} into MySQL facts (${answersWithQuestion.length} question rows)`
  );
};

const startAnalyticsWorker = () => {
  const workerConnection = createRedisConnection();
  workerConnection.on("error", (error) => {
    console.warn(`[analytics-worker] redis connection error: ${error.message}`);
  });

  // Worker runs in separate process so heavy analytics never blocks operational APIs.
  const analyticsWorker = new Worker(
    ANALYTICS_QUEUE_NAME,
    async (job) => {
      if (job.name === "result-submitted") {
        await processResultSubmittedJob(job);
        return;
      }

      console.warn(`[analytics-worker] Unknown job name received: ${job.name}`);
    },
    {
      connection: workerConnection,
      concurrency: Number(process.env.ANALYTICS_WORKER_CONCURRENCY || 5),
    }
  );

  analyticsWorker.on("ready", () => {
    console.log("[analytics-worker] worker ready");
  });

  analyticsWorker.on("completed", (job) => {
    console.log(`[analytics-worker] completed job ${job.id} (${job.name})`);
  });

  analyticsWorker.on("failed", (job, error) => {
    console.error(
      `[analytics-worker] failed job ${job?.id} (${job?.name}) attempt ${job?.attemptsMade}: ${error.message}`
    );
  });

  analyticsWorker.on("error", (error) => {
    console.error("[analytics-worker] worker error:", error.message);
  });

  return analyticsWorker;
};

module.exports = {
  startAnalyticsWorker,
};
