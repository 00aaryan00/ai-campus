const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");

const authRoutes = require("./routes/authRoutes");
const platformRoutes = require("./routes/platformRoutes");
const adminRoutes = require("./routes/adminRoutes");
const resultRoutes = require("./routes/resultRoutes");
const testRoutes = require("./routes/testRoutes");
const { createRedisConnection } = require("./config/redis");
const {
  WORKER_HEARTBEAT_KEY,
  WORKER_HEARTBEAT_MAX_AGE_MS,
} = require("./config/health");
const { resolveTenantFromSlug } = require("./middleware/tenantMiddleware");
const { notFound, errorHandler } = require("./middleware/errorMiddleware");

const app = express();

app.use(
  cors({
    origin: true,
    credentials: true,
  })
);
app.use(express.json());

app.get("/api/health", (req, res) => {
  const mongoConnected = mongoose.connection.readyState === 1;
  res.status(mongoConnected ? 200 : 503).json({
    success: mongoConnected,
    service: "backend",
    mongo: mongoConnected ? "up" : "down",
    timestamp: new Date().toISOString(),
  });
});

app.get("/api/health/redis", async (req, res) => {
  const redis = createRedisConnection();
  try {
    const pong = await redis.ping();
    res.status(pong === "PONG" ? 200 : 503).json({
      success: pong === "PONG",
      service: "redis",
      status: pong,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(503).json({
      success: false,
      service: "redis",
      status: "down",
      error: error.message,
      timestamp: new Date().toISOString(),
    });
  } finally {
    redis.quit().catch(() => {});
  }
});

app.get("/api/health/worker", async (req, res) => {
  const redis = createRedisConnection();
  try {
    const raw = await redis.get(WORKER_HEARTBEAT_KEY);
    const lastHeartbeat = Number(raw || 0);
    const ageMs = Date.now() - lastHeartbeat;
    const isHealthy = lastHeartbeat > 0 && ageMs <= WORKER_HEARTBEAT_MAX_AGE_MS;

    res.status(isHealthy ? 200 : 503).json({
      success: isHealthy,
      service: "analytics-worker",
      status: isHealthy ? "up" : "down",
      lastHeartbeat,
      ageMs,
      maxAllowedAgeMs: WORKER_HEARTBEAT_MAX_AGE_MS,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(503).json({
      success: false,
      service: "analytics-worker",
      status: "unknown",
      error: error.message,
      timestamp: new Date().toISOString(),
    });
  } finally {
    redis.quit().catch(() => {});
  }
});

app.get("/api/health/ai-service", async (req, res) => {
  const aiServiceUrl = process.env.AI_SERVICE_URL || "http://127.0.0.1:8001";
  try {
    const response = await fetch(`${aiServiceUrl}/health`, { method: "GET" });
    res.status(response.ok ? 200 : 503).json({
      success: response.ok,
      service: "ai-service",
      status: response.status,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(503).json({
      success: false,
      service: "ai-service",
      status: "down",
      error: error.message,
      timestamp: new Date().toISOString(),
    });
  }
});

app.get("/api/t/:tenantSlug/health", resolveTenantFromSlug, (req, res) => {
  res.status(200).json({
    success: true,
    tenant: {
      id: req.tenant._id,
      name: req.tenant.name,
      slug: req.tenant.slug,
      status: req.tenant.status,
      authMode: req.tenant.authMode,
      domains: req.tenant.domains || [],
    },
    message: "Tenant is resolvable",
    timestamp: new Date().toISOString(),
  });
});

app.use("/api/platform", platformRoutes);

const tenantApiRouter = express.Router({ mergeParams: true });
tenantApiRouter.use(resolveTenantFromSlug);
tenantApiRouter.use("/auth", authRoutes);
tenantApiRouter.use("/admin", adminRoutes);
tenantApiRouter.use("/tests", testRoutes);
tenantApiRouter.use("/results", resultRoutes);

app.use("/api/t/:tenantSlug", tenantApiRouter);

app.use(notFound);
app.use(errorHandler);

module.exports = app;
