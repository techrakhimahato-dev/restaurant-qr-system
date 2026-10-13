import cors from "cors";
import express from "express";
import healthRouter from "./routes/health.ts";
import menuRouter from "./routes/menu.ts";
import ordersRouter from "./routes/orders.ts";
import tablesRouter from "./routes/tables.ts";
import { errorHandler } from "./middleware/errorHandler.ts";

const app = express();
const allowedOrigins = (process.env.FRONTEND_URL ?? "http://localhost:3000")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

app.disable("x-powered-by");
app.use((request, response, next) => {
  response.setHeader("X-Content-Type-Options", "nosniff");
  response.setHeader("X-Frame-Options", "DENY");
  response.setHeader("Referrer-Policy", "no-referrer");
  next();
});
app.use(cors({
  origin(origin, callback) {
    callback(null, !origin || allowedOrigins.includes(origin));
  },
}));
app.use(express.json({ limit: "32kb" }));
app.use("/api/health", healthRouter);
app.use("/api", menuRouter);
app.use("/api/tables", tablesRouter);
app.use("/api/orders", ordersRouter);

app.use((_request, response) => response.status(404).json({ error: "Route was not found" }));
app.use(errorHandler);

export default app;
