import { BrowserWindow } from "electron";
import { join } from "path";
import log from "electron-log/main";
import { is } from "@electron-toolkit/utils";
import {
  getIsUpdatePending,
  getPendingUpdateInfo,
  showUpdateDialog,
} from "./autoupdate";

const windowLog = log.scope("window");

let mainWindow;

export function createMainWindow() {
  windowLog.info("Creating main window...");

  mainWindow = new BrowserWindow({
    width: 800,
    height: 400,
    show: false,
    autoHideMenuBar: true,
    frame: false,
    alwaysOnTop: false,
    webPreferences: {
      preload: join(__dirname, "../preload/index.js"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  mainWindow.on("ready-to-show", () => {
    mainWindow.show();

    if (getIsUpdatePending()) {
      const info = getPendingUpdateInfo();
      windowLog.info(
        `Pending update ${info?.version} found on window creation. Prompting user.`,
      );
      showUpdateDialog(mainWindow, info);
    }
  });

  if (is.dev && process.env["ELECTRON_RENDERER_URL"]) {
    windowLog.info("Loading renderer from dev URL...");
    mainWindow.loadURL(process.env["ELECTRON_RENDERER_URL"]);
  } else {
    windowLog.info("Loading renderer from file...");
    mainWindow.loadFile(join(__dirname, "../renderer/index.html"));
  }

  return mainWindow;
}

export function getMainWindow() {
  return mainWindow;
}

let overlayWindow;

export function createOverlayWindow(routePath = "/session") {
  if (overlayWindow && !overlayWindow.isDestroyed()) {
    overlayWindow.focus();
    return;
  }

  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send("overlay-state-changed", { isOpen: true });
    mainWindow.minimize();
  }

  overlayWindow = new BrowserWindow({
    width: 800,
    height: 200,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    webPreferences: {
      preload: join(__dirname, "../preload/index.js"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  if (is.dev && process.env["ELECTRON_RENDERER_URL"]) {
    overlayWindow.loadURL(
      `${process.env["ELECTRON_RENDERER_URL"]}#${routePath}`,
    );
  } else {
    const url = new URL(join(__dirname, "../renderer/index.html"), "file:");
    url.hash = routePath;
    overlayWindow.loadURL(url.href);
  }

  overlayWindow.on("closed", () => {
    overlayWindow = null;

    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send("overlay-state-changed", { isOpen: false });
      if (mainWindow.isMinimized()) {
        mainWindow.restore();
      }
      mainWindow.focus();
    }
  });

  return overlayWindow;
}

export function closeOverlayWindow() {
  if (overlayWindow && !overlayWindow.isDestroyed()) {
    overlayWindow.close();
  }
}

export function setOverlayIgnoreMouseEvents(ignore, options) {
  if (overlayWindow && !overlayWindow.isDestroyed()) {
    overlayWindow.setIgnoreMouseEvents(ignore, options);
  }
}
