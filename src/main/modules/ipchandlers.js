import { ipcMain, net, app, session } from "electron";
import { getMainWindow } from "./windowmanager";
import log from "electron-log/main";
import { setPrereleaseChannel } from "./autoupdate";
import { createAuthWindow } from "./auth";

const ipcHandlerLog = log.scope("ipchandler");

// const API_BASE_URL = "https://translator.my-uam.com";
const API_BASE_URL = "http://localhost:8000";

function parseCookie(cookieStr) {
  const parts = cookieStr.split(";");
  const [name, value] = parts[0].split("=");
  return { name: name.trim(), value: value.trim() };
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
    return await makeApiRequest("/api/auth/calendar-join", "POST", payload);
  });

  ipcMain.handle("auth:request-login", async (event, email, language) => {
    ipcHandlerLog.info(
      `Requesting login URL for: ${email} with language: ${language}`,
    );
    try {
      const { data, headers } = await makeApiRequest(
        "/api/auth/login",
        "POST",
        { email, language },
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
  });

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
    ipcHandlerLog.info("Attempting to join Zoom session via IPC...");
    try {
      const { data } = await makeApiRequest("/api/auth/zoom", "POST", payload);
      return { status: "ok", data };
    } catch (error) {
      ipcHandlerLog.error("Zoom join failed:", error.message);
      return { status: "error", message: error.message };
    }
  });

  ipcMain.handle("auth:join-standalone", async (event, payload) => {
    ipcHandlerLog.info("Attempting to join Standalone session via IPC...");
    try {
      const { data } = await makeApiRequest(
        "/api/auth/standalone",
        "POST",
        payload,
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

  ipcMain.handle("admin:get-metrics", async () => {
    ipcHandlerLog.info("Fetching system metrics via IPC...");
    try {
      const [serverRes, zoomRes] = await Promise.all([
        makeApiRequest("/api/metrics/server", "GET"),
        makeApiRequest("/api/metrics/zoom", "GET"),
      ]);
      return {
        status: "ok",
        data: {
          server: serverRes.data,
          zoom: zoomRes.data,
        },
      };
    } catch (error) {
      ipcHandlerLog.error("Failed to fetch metrics:", error);
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
              resolve({ status: "ok", data: buffer });
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
