import dotenv from "dotenv";
import { fileURLToPath } from "node:url";
import { formatMongoConnectionError } from "./config/mongoDiagnostics.ts";
import { setServers } from "node:dns";

// Resolve .env beside the backend package, even when the command is launched elsewhere.
dotenv.config({
  path: fileURLToPath(new URL("../.env", import.meta.url)),
  quiet: true,
});

const dnsServers = process.env.MONGODB_DNS_SERVERS?.split(",")
  .map((server) => server.trim())
  .filter(Boolean);
if (dnsServers && dnsServers.length > 0) {
  setServers(dnsServers);
}
// Import modules that read environment configuration only after dotenv has run.
const [{ default: app }, { connectToDatabase }] = await Promise.all([
  import("./app.ts"),
  import("./config/database.ts"),
]);

const port = Number(process.env.PORT ?? 4000);

if (!Number.isInteger(port) || port < 1 || port > 65535) {
  throw new Error("PORT must be an integer between 1 and 65535");
}

try {
  await connectToDatabase();
  app.listen(port, () => {
    console.info(`Restaurant API listening on port ${port}`);
  });
} catch (error) {
  const details = formatMongoConnectionError(error);
  console.error(
    `Unable to connect to MongoDB (${details.category}). ${details.message}`,
  );
  if (details.code) console.error(`MongoDB error code: ${details.code}`);
  process.exitCode = 1;
}
