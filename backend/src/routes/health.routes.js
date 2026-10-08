import { Router } from "express";
import mongoose from "mongoose";
import env from "../config/env.js";

const router = Router();

router.get("/", (req, res) => {
  const databaseConnected = mongoose.connection.readyState === 1;

  return res.status(databaseConnected ? 200 : 503).json({
    success: databaseConnected,
    message: databaseConnected
      ? "Ashivam backend is healthy"
      : "Ashivam backend database is unavailable",
    service: "ashivam-website-backend",
    environment: env.nodeEnv,
    database: databaseConnected ? "connected" : "disconnected",
    uptimeSeconds: Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
  });
});

router.get("/liveness", (req, res) => {
  return res.status(200).json({
    success: true,
    status: "alive",
    timestamp: new Date().toISOString(),
  });
});

export default router;