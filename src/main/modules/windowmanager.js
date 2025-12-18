import { BrowserWindow } from "electron";
import { join } from "path";
import log from "electron-log/main";
import { is } from "@electron-toolkit/utils";

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
