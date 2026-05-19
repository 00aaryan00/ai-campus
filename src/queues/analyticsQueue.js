const { Queue, QueueEvents } = require("bullmq");

const { createRedisConnection } = require("../config/redis");

const ANALYTICS_QUEUE_NAME = "analytics-jobs";

const queueConnection = createRedisConnection();
const queueEventsConnection = createRedisConnection();
queueConnection.on("error", (error) => {
  console.warn(`[analytics-queue] redis connection error: ${error.message}`);
});
queueEventsConnection.on("error", (error) => {
  console.warn(`[analytics-queue] redis events connection error: ${error.message}`);
});

// Queue decouples write-heavy analytics work from request/response API latency.
const analyticsQueue = new Queue(ANALYTICS_QUEUE_NAME, {
  connection: queueConnection,
  defaultJobOptions: {
    attempts: 5,
    backoff: {
      type: "exponential",
      delay: 2000,
    },
    removeOnComplete: 500,
    removeOnFail: 1000,
  },
});

const analyticsQueueEvents = new QueueEvents(ANALYTICS_QUEUE_NAME, {
  connection: queueEventsConnection,
});

analyticsQueueEvents.on("ready", () => {
  console.log("[analytics-queue] queue events ready");
});

analyticsQueueEvents.on("completed", ({ jobId }) => {
  console.log(`[analytics-queue] job completed: ${jobId}`);
});

analyticsQueueEvents.on("failed", ({ jobId, failedReason }) => {
  console.error(`[analytics-queue] job failed: ${jobId} | reason: ${failedReason}`);
});

analyticsQueueEvents.on("error", (error) => {
  console.error("[analytics-queue] queue events error:", error.message);
});

module.exports = {
  ANALYTICS_QUEUE_NAME,
  analyticsQueue,
  analyticsQueueEvents,
};
