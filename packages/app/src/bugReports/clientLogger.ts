type ClientLogLevel = "debug" | "info" | "warn" | "error";

export type ClientLogEntry = {
  timestamp: string;
  level: ClientLogLevel;
  message: string;
};

type ClientLogFileOptions = {
  title?: string;
  route?: string | null;
  userName?: string | null;
  userEmail?: string | null;
  tenantName?: string | null;
  clientType?: string | null;
  osPlatform?: string | null;
  appVersion?: string | null;
  browserName?: string | null;
  browserVersion?: string | null;
};

const MAX_CLIENT_LOGS = 200;
const clientLogs: ClientLogEntry[] = [];

let isInstalled = false;

function sanitizeValue(value: unknown): string {
  const rawValue =
    typeof value === "string"
      ? value
      : value instanceof Error
        ? `${value.name}: ${value.message}`
        : safeStringify(value);

  return rawValue
    .replace(/(ticket=)[^&\s]+/gi, "$1[redacted]")
    .replace(/(meetingPass(?:word)?["'=:\s]+)([^\s,"'}]+)/gi, "$1[redacted]")
    .replace(/(authorization["'=:\s]+bearer\s+)([^\s,"'}]+)/gi, "$1[redacted]")
    .replace(/(auth_session["'=:\s]+)([^\s,"'}]+)/gi, "$1[redacted]");
}

function safeStringify(value: unknown) {
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

function addClientLog(level: ClientLogLevel, args: unknown[]) {
  const message = args
    .map((value) => sanitizeValue(value))
    .join(" ")
    .trim()
    .slice(0, 2000);

  if (!message) {
    return;
  }

  clientLogs.push({
    timestamp: new Date().toISOString(),
    level,
    message,
  });

  if (clientLogs.length > MAX_CLIENT_LOGS) {
    clientLogs.splice(0, clientLogs.length - MAX_CLIENT_LOGS);
  }
}

/**
 * Appends a structured client log entry without touching the browser console.
 */
export function writeClientLog(level: ClientLogLevel, ...args: unknown[]) {
  addClientLog(level, args);
}

/**
 * Installs browser-side log capture hooks exactly once.
 */
export function initializeClientLogger() {
  if (isInstalled) {
    return;
  }

  isInstalled = true;

  const browser = globalThis as typeof globalThis & {
    addEventListener?: (name: string, handler: (event: any) => void) => void;
    console?: Console;
  };
  const consoleObject = browser.console;

  if (consoleObject) {
    const originalDebug = consoleObject.debug?.bind(consoleObject);
    const originalInfo = consoleObject.info?.bind(consoleObject);
    const originalWarn = consoleObject.warn?.bind(consoleObject);
    const originalError = consoleObject.error?.bind(consoleObject);
    const originalLog = consoleObject.log?.bind(consoleObject);

    consoleObject.debug = (...args: unknown[]) => {
      addClientLog("debug", args);
      originalDebug?.(...args);
    };
    consoleObject.info = (...args: unknown[]) => {
      addClientLog("info", args);
      originalInfo?.(...args);
    };
    consoleObject.warn = (...args: unknown[]) => {
      addClientLog("warn", args);
      originalWarn?.(...args);
    };
    consoleObject.error = (...args: unknown[]) => {
      addClientLog("error", args);
      originalError?.(...args);
    };
    consoleObject.log = (...args: unknown[]) => {
      addClientLog("info", args);
      originalLog?.(...args);
    };
  }

  browser.addEventListener?.("error", (event: any) => {
    addClientLog("error", [event?.message || "Unhandled window error"]);
  });

  browser.addEventListener?.("unhandledrejection", (event: any) => {
    addClientLog("error", [event?.reason || "Unhandled promise rejection"]);
  });

  addClientLog("info", ["Client logger initialized"]);
}

/**
 * Returns the most recent client logs.
 */
export function getClientLogSnapshot() {
  return [...clientLogs];
}

/**
 * Renders a plain-text client log file payload for bug report attachments.
 */
export function buildClientLogFileContent(
  logs: ClientLogEntry[],
  options?: ClientLogFileOptions,
) {
  const headerLines = [
    `Generated At: ${new Date().toISOString()}`,
    `Title: ${options?.title || "Untitled bug report"}`,
    `Route: ${options?.route || "unknown"}`,
    `User: ${options?.userName || options?.userEmail || "unknown"}`,
    `Email: ${options?.userEmail || "unknown"}`,
    `Tenant: ${options?.tenantName || "unknown"}`,
    `Client: ${options?.clientType || "unknown"}`,
    `Platform: ${options?.osPlatform || "unknown"}`,
    `App Version: ${options?.appVersion || "unknown"}`,
    `Browser: ${
      options?.browserName
        ? `${options.browserName} ${options.browserVersion || ""}`.trim()
        : "unknown"
    }`,
    "",
    "Client Logs",
    "-----------",
  ];

  const logLines = logs.length
    ? logs.map((entry) => {
        return `${entry.timestamp} [${entry.level.toUpperCase()}] ${entry.message}`;
      })
    : ["No client logs captured."];

  return [...headerLines, ...logLines].join("\n");
}
