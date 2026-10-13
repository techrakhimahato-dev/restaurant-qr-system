import { Router } from "express";
import mongoose from "mongoose";

const healthRouter = Router();

healthRouter.get("/", (_request, response) => {
  const connected = mongoose.connection.readyState === 1;
  response.status(connected ? 200 : 503).json({ status: connected ? "ok" : "unavailable", database: connected ? "connected" : "disconnected" });
});

export default healthRouter;
