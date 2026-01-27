import { app, BrowserWindow } from "electron";
import { electronApp, optimizer, is } from "@electron-toolkit/utils";
import log from "electron-log/main";

import { createMainWindow, getMainWindow } from "./modules/windowmanager";
import { registerIpcHandlers } from "./modules/ipchandlers";
import { createApplicationMenu } from "./modules/appmenu";
import {
  setupAutoUpdaterListeners,
  checkForUpdates,
} from "./modules/autoupdate";

log.initialize();
log.errorHandler.startCatching();
const mainLog = log.scope("main");

const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  mainLog.info("Another instance is already running. Quitting...");
  app.quit(); //
} else {
  app.on("second-instance", (event, commandLine, workingDirectory) => {
    const mainWindow = getMainWindow();
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore(); //
      mainWindow.focus();
    }
  });

  app.whenReady().then(() => {
    mainLog.info("App is ready.");
    setupAutoUpdaterListeners();
    checkForUpdates();

    // const UPDATE_CHECK_INTERVAL = 4 * 60 * 60 * 1000;
    const UPDATE_CHECK_INTERVAL = 10 * 60 * 1000; // 10 minutes for testing
    setInterval(() => {
      mainLog.info("Running periodic background update check...");
      checkForUpdates();
    }, UPDATE_CHECK_INTERVAL);

    createMainWindow();
    registerIpcHandlers();
    createApplicationMenu();

    electronApp.setAppUserModelId("com.electron");

    app.on("browser-window-created", (_, window) => {
      optimizer.watchWindowShortcuts(window);
    });

    app.on("activate", function () {
      if (BrowserWindow.getAllWindows().length === 0) {
        createMainWindow();
      }
    });
  });
}

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});
