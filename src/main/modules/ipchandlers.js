import { ipcMain, net, app, session } from "electron";
import { getMainWindow } from "./windowmanager";
import log from "electron-log/main";
import { setPrereleaseChannel } from "./autoupdate";
import { createAuthWindow } from "./auth";

const ipcHandlerLog = log.scope("ipchandler");

const API_BASE_URL = "https://translator-test.my-uam.com";

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
          try {
            if (response.statusCode >= 200 && response.statusCode < 300) {
              resolve({
                data: JSON.parse(data),
                headers: response.headers,
              });
            } else {
              const errorMsg = data
                ? JSON.parse(data)
                : { detail: response.statusMessage };
              reject(
                new Error(
                  errorMsg.detail ||
                    `Request failed with status ${response.statusCode}`,
                ),
              );
            }
          } catch (e) {
            reject(new Error("Failed to parse server response"));
          }
        });
      });

      request.on("error", (error) => {
        reject(error);
      });

      if (body) {
        request.write(JSON.stringify(body));
      }
      request.end();
    } catch (err) {
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

  ipcMain.handle("auth:request-login", async (event, email) => {
    ipcHandlerLog.info(`Requesting login URL for: ${email}`);
    try {
      const { data, headers } = await makeApiRequest(
        "/api/auth/login",
        "POST",
        { email },
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

  ipcMain.handle("auth:logout", async () => {
    ipcHandlerLog.info("Logging out via IPC...");
    try {
      await makeApiRequest("/api/auth/logout", "POST");
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

  ipcMain.handle("auth:join-test", async (event, payload) => {
    ipcHandlerLog.info("Attempting to join Test session via IPC...");
    try {
      const { data } = await makeApiRequest("/api/auth/test", "POST", payload);
      return { status: "ok", data };
    } catch (error) {
      ipcHandlerLog.error("Test join failed:", error.message);
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

  ipcMain.handle("download-vtt", async () => {
    const DOWNLOAD_API_URL = "https://translator.my-uam.com/api/download-vtt";
    ipcHandlerLog.info("Handling download-vtt request...");

    const cookies = await session.defaultSession.cookies.get({
      url: API_BASE_URL,
    });
    const cookieHeader = cookies.map((c) => `${c.name}=${c.value}`).join("; ");

    return new Promise((resolve) => {
      const request = net.request({
        method: "GET",
        url: DOWNLOAD_API_URL,
      });

      if (cookieHeader) {
        request.setHeader("Cookie", cookieHeader);
      }

      let chunks = [];

      request.on("response", (response) => {
        ipcHandlerLog.info(
          `DOWNLOAD_API_URL response status: ${response.statusCode}`,
        );

        response.on("data", (chunk) => {
          chunks.push(chunk);
        });

        response.on("end", () => {
          ipcHandlerLog.info("Download request finished.");
          if (response.statusCode >= 200 && response.statusCode < 300) {
            const buffer = Buffer.concat(chunks);
            resolve({ status: "ok", data: buffer });
          } else {
            ipcHandlerLog.error(
              `Download failed with status: ${response.statusCode}`,
            );
            resolve({
              status: "error",
              message: `Download failed with status: ${response.statusCode}`,
            });
          }
        });

        response.on("error", (error) => {
          ipcHandlerLog.error("Error during download response: ", error);
          resolve({
            status: "error",
            message: error.message || "Unknown error during download response",
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
  });
}
