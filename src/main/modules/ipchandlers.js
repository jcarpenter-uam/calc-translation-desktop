import {
  ipcMain,
  net,
  app,
  session,
  clipboard,
  desktopCapturer,
  BrowserWindow,
} from "electron";
import { readFile } from "node:fs/promises";
import {
  getMainWindow,
  createOverlayWindow,
  closeOverlayWindow,
  setOverlayIgnoreMouseEvents,
} from "./windowmanager";
import log from "electron-log/main";
import { setPrereleaseChannel } from "./autoupdate";
import { createAuthWindow } from "./auth";
import { API_BASE_URL } from "../../shared/network";

const ipcHandlerLog = log.scope("ipchandler");
const MAX_BUG_REPORT_LOG_BYTES = 512 * 1024;

function summarizeJoinRequest(integration, payload = {}) {
  if (integration === "calendar") {
    return {
      meetingId: payload.meetingId || null,
      hasJoinUrl: Boolean(payload.joinUrl),
      startTime: payload.startTime || null,
    };
  }

  if (integration === "zoom") {
    return {
      meetingId: payload.meetingid || null,
      hasJoinUrl: Boolean(payload.join_url),
      hasPassword: Boolean(payload.meetingpass),
    };
  }

  if (integration === "standalone") {
    return {
      host: Boolean(payload.host),
      hasJoinUrl: Boolean(payload.join_url),
      translationType: payload.translation_type || null,
      languageA: payload.language_a || null,
      languageB: payload.language_b || null,
      languageHints: Array.isArray(payload.language_hints)
        ? payload.language_hints
        : null,
    };
  }

  return payload;
}

function summarizeJoinResponse(integration, data = {}) {
  return {
    integration,
    sessionId: data.sessionId || null,
    type: data.type || null,
    meetingId: data.meetingId || data.meetingid || null,
    hasJoinUrl: Boolean(data.joinUrl || data.join_url),
  };
}

function parseCookie(cookieStr) {
  const parts = cookieStr.split(";");
  const [name, value] = parts[0].split("=");
  return { name: name.trim(), value: value.trim() };
}

async function getCookieHeader() {
  const cookies = await session.defaultSession.cookies.get({
    url: API_BASE_URL,
  });
  return cookies.map((c) => `${c.name}=${c.value}`).join("; ");
}

async function getMainLogAttachment() {
  const fileTransport = log.transports.file;
  const file = typeof fileTransport.getFile === "function" ? fileTransport.getFile() : null;
  const logPath = file?.path;

  if (!logPath) {
    throw new Error("Desktop log file path is unavailable");
  }

  const contents = await readFile(logPath);
  const sliceStart = Math.max(0, contents.length - MAX_BUG_REPORT_LOG_BYTES);
  const trimmed = contents.subarray(sliceStart);

  return {
    fileName: "desktop-main.log",
    mimeType: "text/plain",
    bytes: trimmed,
  };
}

async function makeMultipartApiRequest(endpoint, formData) {
  const cookieHeader = await getCookieHeader();
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    method: "POST",
    headers: cookieHeader ? { Cookie: cookieHeader } : undefined,
    body: formData,
  });

  const contentType = response.headers.get("content-type") || "";
  const responseText = await response.text();
  const responseData = contentType.includes("application/json")
    ? JSON.parse(responseText || "null")
    : responseText;

  if (!response.ok) {
    const errorMessage =
      responseData?.detail ||
      responseData?.message ||
      responseData ||
      `Request failed with status ${response.status}`;
    throw new Error(errorMessage);
  }

  return { data: responseData };
}

async function makeTextApiRequest(endpoint, method = "GET") {
  const cookieHeader = await getCookieHeader();
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    method,
    headers: cookieHeader ? { Cookie: cookieHeader } : undefined,
  });
  const responseText = await response.text();

  if (!response.ok) {
    let errorMessage = responseText;
    try {
      const parsed = JSON.parse(responseText || "null");
      errorMessage = parsed?.detail || parsed?.message || responseText;
    } catch {
      // Keep text response as-is.
    }
    throw new Error(errorMessage || `Request failed with status ${response.status}`);
  }

  return { data: responseText };
}

function makeApiRequest(endpoint, method, body = null) {
  return new Promise(async (resolve, reject) => {
    try {
      const cookies = await session.defaultSession.cookies.get({
        url: API_BASE_URL,
      });
      const cookieHeader = cookies
        .map((c) => `${c.name}=${c.value}`)
        .join("; ");

      const request = net.request({
        method: method,
        url: `${API_BASE_URL}${endpoint}`,
      });

      request.setHeader("Content-Type", "application/json");

      if (cookieHeader) {
        request.setHeader("Cookie", cookieHeader);
      }

      request.on("response", (response) => {
        let data = "";
        response.on("data", (chunk) => {
          data += chunk;
        });

        response.on("end", () => {
          let parsedData = null;
          try {
            if (data && data.trim().length > 0) {
              parsedData = JSON.parse(data);
            }
          } catch (e) {
            ipcHandlerLog.warn(
              `Failed to parse JSON from ${endpoint}. Raw response: ${data.substring(0, 200)}...`,
            );
          }

          if (response.statusCode >= 200 && response.statusCode < 300) {
            resolve({
              data: parsedData || data,
              headers: response.headers,
            });
          } else {
            let errorMessage =
              parsedData?.detail ||
              parsedData?.message ||
              parsedData?.error ||
              (typeof parsedData === "string" ? parsedData : null) ||
              data ||
              `Request failed with status ${response.statusCode}`;

            if (typeof errorMessage === "object") {
              errorMessage = JSON.stringify(errorMessage);
            }

            ipcHandlerLog.error(
              `API Error [${response.statusCode}]: ${errorMessage}`,
            );
            reject(new Error(errorMessage));
          }
        });
      });

      request.on("error", (error) => {
        ipcHandlerLog.error(`Network Error on ${endpoint}:`, error);
        reject(error);
      });

      if (body) {
        request.write(JSON.stringify(body));
      }
      request.end();
    } catch (err) {
      ipcHandlerLog.error("Request Setup Error:", err);
      reject(err);
    }
  });
}

export function registerIpcHandlers() {
  const mainWindow = getMainWindow();
  if (!mainWindow) {
    ipcHandlerLog.error("registerIpcHandlers: mainWindow not available!");
    return;
  }

  ipcMain.handle("desktop:get-sources", async () => {
    try {
      const sources = await desktopCapturer.getSources({ types: ["screen"] });
      return sources;
    } catch (error) {
      console.error("Failed to get desktop sources:", error);
      throw error;
    }
  });

  ipcMain.on("set-start-on-boot", (event, shouldStart) => {
    app.setLoginItemSettings({
      openAtLogin: shouldStart,
      path: app.getPath("exe"),
    });
  });

  ipcMain.handle("get-start-on-boot", () => {
    return app.getLoginItemSettings().openAtLogin;
  });

  ipcMain.handle("minimize-window", () => {
    ipcHandlerLog.info("Minimizing window.");
    mainWindow.minimize();
  });

  ipcMain.handle("maximize-window", () => {
    if (mainWindow.isMaximized()) {
      ipcHandlerLog.info("Unmaximizing window.");
      mainWindow.unmaximize();
      return false;
    } else {
      ipcHandlerLog.info("Maximizing window.");
      mainWindow.maximize();
      return true;
    }
  });

  ipcMain.handle("close-window", () => {
    ipcHandlerLog.info("Closing window.");
    mainWindow.close();
  });

  ipcMain.handle("get-window-bounds", (event) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    return win ? win.getBounds() : null;
  });

  ipcMain.on("set-window-bounds", (event, bounds) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    if (win) {
      win.setBounds(bounds);
    }
  });

  ipcMain.handle("overlay:open", (event, routePath) => {
    ipcHandlerLog.info(`Opening overlay window for route: ${routePath}`);
    createOverlayWindow(routePath);
  });

  ipcMain.handle("overlay:close", () => {
    ipcHandlerLog.info("Closing overlay window.");
    closeOverlayWindow();
  });

  ipcMain.handle(
    "overlay:set-ignore-mouse-events",
    (event, ignore, options) => {
      setOverlayIgnoreMouseEvents(ignore, options);
    },
  );

  ipcMain.on("sync-session-data", (event, data) => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send("restore-session-data", data);
    }
  });

  ipcMain.handle("get-app-version", () => {
    const version = app.getVersion();
    ipcHandlerLog.info(`Getting app version: ${version}`);
    return app.getVersion();
  });

  ipcMain.handle("set-prerelease-channel", (event, isBetaEnabled) => {
    ipcHandlerLog.info(`Setting prerelease channel: ${isBetaEnabled}`);
    setPrereleaseChannel(isBetaEnabled);
  });

  ipcMain.handle("toggle-always-on-top", () => {
    const newState = !mainWindow.isAlwaysOnTop();
    ipcHandlerLog.info(`Toggling always-on-top to: ${newState}`);
    mainWindow.setAlwaysOnTop(newState);
    return newState;
  });

  ipcMain.handle("clipboard-write", async (event, text) => {
    clipboard.writeText(text);
    return true;
  });

  ipcMain.handle("calendar:get-events", async (_, start, end) => {
    const params = new URLSearchParams();
    if (start) params.append("start", start);
    if (end) params.append("end", end);
    const queryString = params.toString();
    const endpoint = queryString
      ? `/api/calender/?${queryString}`
      : "/api/calender/";
    return await makeApiRequest(endpoint, "GET");
  });

  ipcMain.handle("calendar:sync", async () => {
    return await makeApiRequest("/api/calender/sync", "GET");
  });

  ipcMain.handle("auth:join-calendar", async (_, payload) => {
    ipcHandlerLog.info(
      "Attempting to join Calendar session via IPC...",
      summarizeJoinRequest("calendar", payload),
    );
    try {
      const { data } = await makeApiRequest(
        "/api/auth/calendar-join",
        "POST",
        payload,
      );
      ipcHandlerLog.info(
        "Calendar join succeeded.",
        summarizeJoinResponse("calendar", data),
      );
      return { status: "ok", data };
    } catch (error) {
      ipcHandlerLog.error("Calendar join failed:", error.message);
      return { status: "error", message: error.message };
    }
  });

  ipcMain.handle(
    "auth:request-login",
    async (event, email, language, provider = null) => {
      ipcHandlerLog.info(
        `Requesting login URL for: ${email} with language: ${language} (Provider: ${provider})`,
      );
      try {
        const body = { email, language };
        if (provider) {
          body.provider = provider;
        }

        const { data, headers } = await makeApiRequest(
          "/api/auth/login",
          "POST",
          body,
        );

        const rawCookies = headers["set-cookie"] || [];

        if (rawCookies.length > 0) {
          ipcHandlerLog.info(
            `Syncing ${rawCookies.length} cookies from API to AuthWindow session.`,
          );

          const cookiePromises = rawCookies.map((cookieStr) => {
            const { name, value } = parseCookie(cookieStr);
            return session.defaultSession.cookies.set({
              url: API_BASE_URL,
              name,
              value,
              secure: true,
              sameSite: "no_restriction",
            });
          });

          await Promise.all(cookiePromises);
        }

        return { status: "ok", data: data };
      } catch (error) {
        ipcHandlerLog.error("Login request failed:", error);
        return { status: "error", message: error.message };
      }
    },
  );

  ipcMain.handle("start-auth-flow", async (event, loginUrl) => {
    ipcHandlerLog.info("Starting auth flow with URL:", loginUrl);
    try {
      await createAuthWindow(loginUrl);
      ipcHandlerLog.info("Auth flow completed successfully.");

      return { status: "success" };
    } catch (error) {
      ipcHandlerLog.error("Auth flow failed or cancelled:", error);
      return { status: "error", message: error.message };
    }
  });

  ipcMain.handle("auth:get-user", async () => {
    ipcHandlerLog.info("Fetching current user profile via IPC...");
    try {
      const { data } = await makeApiRequest("/api/users/me", "GET");
      return { status: "ok", data };
    } catch (error) {
      ipcHandlerLog.warn("Failed to fetch user:", error.message);
      return { status: "error", message: error.message };
    }
  });

  ipcMain.handle("support:submit-bug-report", async (_, payload) => {
    ipcHandlerLog.info("Submitting desktop bug report via IPC...");
    try {
      const logAttachment = await getMainLogAttachment();
      const formData = new FormData();
      formData.append("title", payload?.title || "");
      formData.append("description", payload?.description || "");
      formData.append("steps_to_reproduce", payload?.stepsToReproduce || "");
      formData.append("expected_behavior", payload?.expectedBehavior || "");
      formData.append("actual_behavior", payload?.actualBehavior || "");
      formData.append("app_version", app.getVersion());
      formData.append("platform", process.platform);
      formData.append(
        "main_log",
        new Blob([logAttachment.bytes], { type: logAttachment.mimeType }),
        logAttachment.fileName,
      );

      const { data } = await makeMultipartApiRequest("/api/bug-reports/", formData);
      return { status: "ok", data };
    } catch (error) {
      ipcHandlerLog.error("Bug report submission failed:", error.message || error);
      return { status: "error", message: error.message || "Failed to submit bug report" };
    }
  });

  ipcMain.handle("users:update-language", async (event, languageCode) => {
    ipcHandlerLog.info(`Updating user language preference to: ${languageCode}`);
    try {
      const { data } = await makeApiRequest("/api/users/me/language", "PUT", {
        language_code: languageCode,
      });
      return { status: "ok", data };
    } catch (error) {
      ipcHandlerLog.error("Failed to update language:", error.message);
      return { status: "error", message: error.message };
    }
  });

  ipcMain.handle("users:update-onboarding-tour", async (event, completed) => {
    ipcHandlerLog.info(
      `Updating onboarding tour completion status to: ${Boolean(completed)}`,
    );
    try {
      const { data } = await makeApiRequest(
        "/api/users/me/onboarding-tour",
        "POST",
        {
          onboarding_tour_completed: Boolean(completed),
        },
      );
      return { status: "ok", data };
    } catch (error) {
      ipcHandlerLog.error(
        "Failed to update onboarding tour completion:",
        error.message,
      );
      return { status: "error", message: error.message };
    }
  });

  ipcMain.handle("auth:logout", async () => {
    ipcHandlerLog.info("Logging out via IPC...");
    try {
      await makeApiRequest("/api/auth/logout", "POST");

      const cookies = await session.defaultSession.cookies.get({
        url: API_BASE_URL,
      });

      if (cookies.length > 0) {
        const removalPromises = cookies.map((cookie) => {
          return session.defaultSession.cookies.remove(
            API_BASE_URL,
            cookie.name,
          );
        });
        await Promise.all(removalPromises);
        ipcHandlerLog.info(`Cleared ${cookies.length} cookies.`);
      }

      return { status: "ok" };
    } catch (error) {
      return { status: "error", message: error.message };
    }
  });

  ipcMain.handle("auth:join-zoom", async (event, payload) => {
    ipcHandlerLog.info(
      "Attempting to join Zoom session via IPC...",
      summarizeJoinRequest("zoom", payload),
    );
    try {
      const { data } = await makeApiRequest("/api/auth/zoom", "POST", payload);
      ipcHandlerLog.info(
        "Zoom join succeeded.",
        summarizeJoinResponse("zoom", data),
      );
      return { status: "ok", data };
    } catch (error) {
      ipcHandlerLog.error("Zoom join failed:", error.message);
      return { status: "error", message: error.message };
    }
  });

  ipcMain.handle("auth:join-standalone", async (event, payload) => {
    ipcHandlerLog.info(
      "Attempting to join Standalone session via IPC...",
      summarizeJoinRequest("standalone", payload),
    );
    try {
      const { data } = await makeApiRequest(
        "/api/auth/standalone",
        "POST",
        payload,
      );
      ipcHandlerLog.info(
        "Standalone join succeeded.",
        summarizeJoinResponse("standalone", data),
      );
      return { status: "ok", data };
    } catch (error) {
      ipcHandlerLog.error("Standalone join failed:", error.message);
      return { status: "error", message: error.message };
    }
  });

  // NOTE: Not sure if its worth handling this within the desktop application yet
  ipcMain.handle("auth:link-zoom", async () => {
    ipcHandlerLog.info("Linking pending Zoom account via IPC...");
    try {
      const { data } = await makeApiRequest(
        "/api/auth/zoom/link-pending",
        "POST",
      );
      return { status: "ok", data };
    } catch (error) {
      ipcHandlerLog.error("Zoom linking failed:", error.message);
      return { status: "error", message: error.message };
    }
  });

  ipcMain.handle("admin:get-users", async () => {
    try {
      const { data } = await makeApiRequest("/api/users/", "GET");
      return { status: "ok", data };
    } catch (error) {
      return { status: "error", message: error.message };
    }
  });

  ipcMain.handle(
    "admin:set-user-admin-status",
    async (event, userId, updateData) => {
      try {
        const { data } = await makeApiRequest(
          `/api/users/${userId}/admin`,
          "PUT",
          updateData,
        );
        return { status: "ok", data };
      } catch (error) {
        return { status: "error", message: error.message };
      }
    },
  );

  ipcMain.handle("admin:delete-user", async (event, userId) => {
    try {
      await makeApiRequest(`/api/users/${userId}`, "DELETE");
      return { status: "ok" };
    } catch (error) {
      return { status: "error", message: error.message };
    }
  });

  ipcMain.handle("admin:get-tenants", async () => {
    try {
      const { data } = await makeApiRequest("/api/tenant/", "GET");
      return { status: "ok", data };
    } catch (error) {
      return { status: "error", message: error.message };
    }
  });

  ipcMain.handle("admin:create-tenant", async (event, createData) => {
    try {
      const { data } = await makeApiRequest("/api/tenant/", "POST", createData);
      return { status: "ok", data };
    } catch (error) {
      return { status: "error", message: error.message };
    }
  });

  ipcMain.handle("admin:update-tenant", async (event, tenantId, updateData) => {
    try {
      const { data } = await makeApiRequest(
        `/api/tenant/${tenantId}`,
        "PATCH",
        updateData,
      );
      return { status: "ok", data };
    } catch (error) {
      return { status: "error", message: error.message };
    }
  });

  ipcMain.handle("admin:delete-tenant", async (event, tenantId) => {
    try {
      await makeApiRequest(`/api/tenant/${tenantId}`, "DELETE");
      return { status: "ok" };
    } catch (error) {
      return { status: "error", message: error.message };
    }
  });

  ipcMain.handle("admin:get-logs", async () => {
    try {
      const { data } = await makeApiRequest("/api/logs/?lines=200", "GET");
      return { status: "ok", data };
    } catch (error) {
      return { status: "error", message: error.message };
    }
  });

  ipcMain.handle("admin:get-reviews", async () => {
    try {
      const { data } = await makeApiRequest("/api/reviews/", "GET");
      return { status: "ok", data };
    } catch (error) {
      return { status: "error", message: error.message };
    }
  });

  ipcMain.handle("admin:get-bug-reports", async (_, status = "open") => {
    try {
      const { data } = await makeApiRequest(`/api/bug-reports/?status=${encodeURIComponent(status)}`, "GET");
      return { status: "ok", data };
    } catch (error) {
      return { status: "error", message: error.message };
    }
  });

  ipcMain.handle("admin:get-bug-report-log", async (_, reportId) => {
    try {
      const { data } = await makeTextApiRequest(`/api/bug-reports/${reportId}/log`, "GET");
      return { status: "ok", data };
    } catch (error) {
      return { status: "error", message: error.message };
    }
  });

  ipcMain.handle("admin:set-bug-report-resolved", async (_, reportId, isResolved) => {
    try {
      const { data } = await makeApiRequest(
        `/api/bug-reports/${reportId}/resolve`,
        "PATCH",
        { is_resolved: Boolean(isResolved) },
      );
      return { status: "ok", data };
    } catch (error) {
      return { status: "error", message: error.message };
    }
  });

  ipcMain.handle(
    "download-vtt",
    async (event, { integration, sessionId, token, language }) => {
      const encodedSessionId = encodeURIComponent(sessionId);

      const endpoint = `/api/session/${integration}/${encodedSessionId}/download/vtt?token=${token}&language=${language}`;
      const DOWNLOAD_API_URL = `${API_BASE_URL}${endpoint}`;

      ipcHandlerLog.info(
        `Handling download-vtt request for URL: ${DOWNLOAD_API_URL}`,
      );

      const cookies = await session.defaultSession.cookies.get({
        url: API_BASE_URL,
      });
      const cookieHeader = cookies
        .map((c) => `${c.name}=${c.value}`)
        .join("; ");

      return new Promise((resolve) => {
        const request = net.request({
          method: "GET",
          url: DOWNLOAD_API_URL,
        });

        if (cookieHeader) {
          request.setHeader("Cookie", cookieHeader);
        }

        // Doesnt hurt
        if (token) {
          request.setHeader("Authorization", `Bearer ${token}`);
        }

        let chunks = [];

        request.on("response", (response) => {
          ipcHandlerLog.info(
            `Download response status: ${response.statusCode}`,
          );

          const contentType =
            response.headers["content-type"] ||
            response.headers["Content-Type"];
          const isHtml =
            (Array.isArray(contentType) &&
              contentType[0].includes("text/html")) ||
            (typeof contentType === "string" &&
              contentType.includes("text/html"));

          if (isHtml) {
            ipcHandlerLog.warn(
              "Received HTML response for download. Likely a 404/fallback.",
            );
            response.on("data", (chunk) => {
              chunks.push(chunk);
            });
            response.on("end", () => {
              const body = Buffer.concat(chunks).toString().substring(0, 500);
              ipcHandlerLog.warn(`HTML Response Preview: ${body}`);
              resolve({
                status: "error",
                message:
                  "Download failed: Server returned HTML. Please check the session URL or status.",
              });
            });
            return;
          }

          response.on("data", (chunk) => {
            chunks.push(chunk);
          });

          response.on("end", () => {
            ipcHandlerLog.info("Download request finished.");
            if (response.statusCode >= 200 && response.statusCode < 300) {
              const buffer = Buffer.concat(chunks);
              resolve({
                status: "ok",
                data: buffer,
                headers: response.headers,
              });
            } else {
              const responseBody = Buffer.concat(chunks).toString();
              let errorMessage = `Download failed with status: ${response.statusCode}`;
              try {
                const parsed = JSON.parse(responseBody);
                if (parsed.detail) errorMessage = parsed.detail;
              } catch (e) {}

              ipcHandlerLog.error(errorMessage);
              resolve({
                status: "error",
                message: errorMessage,
              });
            }
          });

          response.on("error", (error) => {
            ipcHandlerLog.error("Error during download response: ", error);
            resolve({
              status: "error",
              message:
                error.message || "Unknown error during download response",
            });
          });
        });

        request.on("error", (error) => {
          ipcHandlerLog.error("Error making download request: ", error);
          resolve({
            status: "error",
            message: error.message || "Unknown error making download request",
          });
        });

        request.end();
      });
    },
  );
}
