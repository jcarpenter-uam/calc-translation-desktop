import { ipcMain, net, app } from "electron";
import { getMainWindow } from "./windowmanager";
import log from "electron-log/main";
import { setPrereleaseChannel } from "./autoupdate";

const ipcHandlerLog = log.scope("ipchandler");

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

  ipcMain.handle("download-vtt", async () => {
    const DOWNLOAD_API_URL = "https://translator.my-uam.com/api/download-vtt";
    ipcHandlerLog.info("Handling download-vtt request...");

    return new Promise((resolve) => {
      const request = net.request({
        method: "GET",
        url: DOWNLOAD_API_URL,
      });

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
