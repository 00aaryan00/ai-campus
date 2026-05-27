const dotenv = require("dotenv");

dotenv.config();

const connectDB = require("../config/db");
const { createRedisConnection } = require("../config/redis");
const {
  WORKER_HEARTBEAT_KEY,
  WORKER_HEARTBEAT_INTERVAL_MS,
} = require("../config/health");
const { startAnalyticsWorker } = require("./analyticsWorker");

let worker;
let heartbeatTimer;
const heartbeatRedis = createRedisConnection();

const startHeartbeat = () => {
  const tick = async () => {
    try {
      await heartbeatRedis.set(WORKER_HEARTBEAT_KEY, String(Date.now()));
    } catch (error) {
      console.warn(`[analytics-worker] heartbeat update failed: ${error.message}`);
    }
  };

  tick();
  heartbeatTimer = setInterval(tick, WORKER_HEARTBEAT_INTERVAL_MS);
};

const shutdown = async (signal) => {
  console.log(`[analytics-worker] ${signal} received. Shutting down...`);

  try {
    if (heartbeatTimer) {
      clearInterval(heartbeatTimer);
    }

    await heartbeatRedis.quit();

    if (worker) {
      await worker.close();
    }

    process.exit(0);
  } catch (error) {
    console.error("[analytics-worker] shutdown error:", error.message);
    process.exit(1);
  }
};

const start = async () => {
  await connectDB();
  worker = startAnalyticsWorker();
  startHeartbeat();
  console.log("[analytics-worker] started");
};

start().catch((error) => {
  console.error("[analytics-worker] failed to start:", error.message);
  process.exit(1);
});

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));
