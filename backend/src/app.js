const express = require("express");
const cors = require("cors");

const authRoutes = require("./routes/authRoutes");
const resultRoutes = require("./routes/resultRoutes");
const testRoutes = require("./routes/testRoutes");
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
  res.status(200).json({
    success: true,
    message: "Backend is running",
  });
});

app.use("/api/auth", authRoutes);
app.use("/api/tests", testRoutes);
app.use("/api/results", resultRoutes);

app.use(notFound);
app.use(errorHandler);

module.exports = app;
