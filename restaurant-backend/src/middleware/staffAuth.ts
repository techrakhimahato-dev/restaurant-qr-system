import { timingSafeEqual } from "node:crypto";
import type { RequestHandler } from "express";

export const requireStaffKey: RequestHandler = (request, response, next) => {
  const expected = process.env.STAFF_API_KEY;
  if (!expected || expected.length < 32) {
    response.status(503).json({ error: "Staff API is disabled until a 32-character STAFF_API_KEY is configured" });
    return;
  }

  const authorization = request.get("authorization") ?? "";
  const provided = authorization.startsWith("Bearer ") ? authorization.slice(7) : "";
  const expectedBytes = Buffer.from(expected);
  const providedBytes = Buffer.from(provided);
  if (providedBytes.length !== expectedBytes.length || !timingSafeEqual(providedBytes, expectedBytes)) {
    response.status(401).json({ error: "Valid staff bearer token required" });
    return;
  }

  next();
};
