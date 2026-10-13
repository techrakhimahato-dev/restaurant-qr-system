import mongoose from "mongoose";

export async function connectToDatabase(): Promise<void> {
  const uri = process.env.MONGODB_URI?.trim();
  if (!uri) {
    throw new Error("MONGODB_URI is required. Copy .env.example to .env and configure it.");
  }

  try {
    const parsed = new URL(uri);
    if (!["mongodb:", "mongodb+srv:"].includes(parsed.protocol) || !parsed.hostname) {
      throw new Error("MONGODB_URI must use mongodb:// or mongodb+srv:// and include a hostname.");
    }
    if (parsed.protocol === "mongodb+srv:" && parsed.port) {
      throw new Error("An mongodb+srv:// URI must not specify a port.");
    }
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("MONGODB_URI")) throw error;
    throw new Error("MONGODB_URI is not a valid MongoDB connection URI. Check its scheme, hostname, and URL-encode special characters in credentials.");
  }

  mongoose.set("strictQuery", true);
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 8_000 });
  console.info("MongoDB connection established");
}
