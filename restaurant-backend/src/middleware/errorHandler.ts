import type { ErrorRequestHandler } from "express";
import mongoose from "mongoose";
import { HttpError } from "../lib/errors.ts";

export const errorHandler: ErrorRequestHandler = (error, _request, response, _next) => {
  if (error instanceof HttpError) {
    response.status(error.statusCode).json({ error: error.message });
    return;
  }

  if (error instanceof mongoose.Error.CastError || error instanceof mongoose.Error.ValidationError) {
    response.status(400).json({ error: "The request contains invalid data" });
    return;
  }

  if (error instanceof SyntaxError && "body" in error) {
    response.status(400).json({ error: "Request body must be valid JSON" });
    return;
  }

  if (typeof error === "object" && error !== null && "status" in error && error.status === 413) {
    response.status(413).json({ error: "Request body is too large" });
    return;
  }

  console.error("Unhandled API error", error);
  response.status(500).json({ error: "An unexpected server error occurred" });
};
