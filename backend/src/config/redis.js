const IORedis = require("ioredis");

const redisUrl = process.env.REDIS_URL || "redis://127.0.0.1:6379";

// BullMQ requires maxRetriesPerRequest=null so command retries are controlled by workers/queue logic.
const createRedisConnection = () =>
  new IORedis(redisUrl, {
    maxRetriesPerRequest: null,
    enableReadyCheck: true,
  });

module.exports = {
  redisUrl,
  createRedisConnection,
};
