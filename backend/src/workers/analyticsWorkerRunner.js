const dotenv = require("dotenv");

dotenv.config();

const connectDB = require("../config/db");
const { startAnalyticsWorker } = require("./analyticsWorker");

let worker;

const shutdown = async (signal) => {
  console.log(`[analytics-worker] ${signal} received. Shutting down...`);

  try {
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
  console.log("[analytics-worker] started");
};

start().catch((error) => {
  console.error("[analytics-worker] failed to start:", error.message);
  process.exit(1);
});

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));
