import { app, BrowserWindow } from "electron";
import { electronApp, optimizer, is } from "@electron-toolkit/utils";
import log from "electron-log/main";

import { createMainWindow } from "./modules/windowmanager";
import { registerIpcHandlers } from "./modules/ipchandlers";
import { createApplicationMenu } from "./modules/appmenu";
import {
  setupAutoUpdaterListeners,
  checkForUpdates,
} from "./modules/autoupdate";

log.initialize();
log.errorHandler.startCatching();

const mainLog = log.scope("main");

app.whenReady().then(() => {
  mainLog.info("App is ready.");

  setupAutoUpdaterListeners();
  mainLog.info("Auto updater listeners set up.");

  checkForUpdates();

  const UPDATE_CHECK_INTERVAL = 4 * 60 * 60 * 1000;
  setInterval(() => {
    mainLog.info("Running periodic background update check...");
    checkForUpdates();
  }, UPDATE_CHECK_INTERVAL);

  createMainWindow();

  registerIpcHandlers();
  mainLog.info("IPC handlers registered.");

  createApplicationMenu();

  electronApp.setAppUserModelId("com.electron");

  app.on("browser-window-created", (_, window) => {
    optimizer.watchWindowShortcuts(window);
  });

  app.on("activate", function () {
    if (BrowserWindow.getAllWindows().length === 0) {
      mainLog.info("App activated, creating main window.");
      createMainWindow();
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    mainLog.info("All windows closed, quitting application.");
    app.quit();
  } else {
    mainLog.info("All windows closed, app will remain active on macOS.");
  }
});
