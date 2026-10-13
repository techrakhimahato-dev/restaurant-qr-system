type DiagnosticError = {
  name?: unknown;
  message?: unknown;
  code?: unknown;
  codeName?: unknown;
  cause?: unknown;
  reason?: unknown;
  servers?: unknown;
};

export type MongoConnectionDiagnostic = {
  category: "configuration" | "authentication" | "DNS" | "network/IP allowlist" | "invalid URI" | "timeout" | "connection";
  message: string;
  code?: string;
};

function errorDetails(error: unknown): DiagnosticError {
  return typeof error === "object" && error !== null ? error as DiagnosticError : {};
}

function collectMessages(error: unknown, depth = 0, seen = new Set<unknown>()): string[] {
  if (depth > 4 || !error || seen.has(error)) return [];
  seen.add(error);
  const detail = errorDetails(error);
  const messages = typeof detail.message === "string" ? [detail.message] : [];
  messages.push(...collectMessages(detail.cause, depth + 1, seen));
  messages.push(...collectMessages(detail.reason, depth + 1, seen));
  if (detail.servers instanceof Map) {
    for (const server of detail.servers.values()) {
      messages.push(...collectMessages(server, depth + 1, seen));
    }
  }
  return messages;
}

function sanitize(message: string): string {
  return message
    .replace(/mongodb(?:\+srv)?:\/\/[^\s,;)}\]]+/gi, "[redacted MongoDB URI]")
    .replace(/\b[^\s:@/]+:[^\s@/]+@/g, "[redacted credentials]@");
}

export function formatMongoConnectionError(error: unknown): MongoConnectionDiagnostic {
  const detail = errorDetails(error);
  const messages = collectMessages(error);
  const combined = `${String(detail.name ?? "")} ${String(detail.codeName ?? "")} ${String(detail.code ?? "")} ${messages.join(" ")}`.toLowerCase();
  let category: MongoConnectionDiagnostic["category"] = "connection";

  if (combined.includes("authentication") || combined.includes("auth failed") || combined.includes("code 18")) category = "authentication";
  else if (/querysrv|enotfound|eai_again|getaddrinfo|srv.*(record|lookup|resolve)|dns/.test(combined)) category = "DNS";
  else if (/not authorized.*ip|ip address.*(not|allow)|not.*whitelist|not.*allowlist|access list/.test(combined)) category = "network/IP allowlist";
  else if (/mongodbparseerror|invalid.*(uri|scheme)|must begin with|must be url encoded|invalid connection string/.test(combined)) category = "invalid URI";
  else if (/timeout|timed out|etimedout|serverselection/.test(combined)) category = /etimedout|network|ip/.test(combined) ? "network/IP allowlist" : "timeout";
  else if (/econnrefused|ehostunreach|enetunreach|connection refused/.test(combined)) category = "network/IP allowlist";
  else if (/mongodb_uri is required/.test(combined)) category = "configuration";

  const safeMessages = [...new Set(messages.map(sanitize).filter(Boolean))].slice(0, 3);
  const codeValue = detail.code ?? detail.codeName;
  return {
    category,
    message: safeMessages.join(" | ") || "No additional MongoDB error message was provided.",
    ...(typeof codeValue === "string" || typeof codeValue === "number" ? { code: String(codeValue) } : {}),
  };
}
