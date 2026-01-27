import { BrowserWindow, dialog } from "electron";
import { autoUpdater } from "electron-updater";
import log from "electron-log/main";
import { getMainWindow } from "./windowmanager";

const autoUpdateLog = log.scope("autoupdate");

let isRollingBack = false;
let isUpdatePending = false;
let lastUpdateInfo = null;

export function setupAutoUpdaterListeners() {
  autoUpdater.channel = "latest";
  autoUpdater.allowPrerelease = false;
  autoUpdater.autoDownload = true;

  autoUpdater.on("update-available", (info) => {
    autoUpdateLog.info("An update is available:", info.version);
  });

  autoUpdater.on("error", (err) => {
    autoUpdateLog.error("Error during update:", err);
    isRollingBack = false;
  });

  autoUpdater.on("update-downloaded", (info) => {
    isUpdatePending = true;
    lastUpdateInfo = info;
    autoUpdateLog.info("Update downloaded. Prompting user...", info);

    const window = getMainWindow() || BrowserWindow.getAllWindows()[0];

    if (window) {
      showUpdateDialog(window, info);
    }
  });
}

export function showUpdateDialog(window, info) {
  const dialogOptions = {
    type: "info",
    buttons: ["Install Now", "Install on Next Start"],
    defaultId: 0,
    cancelId: 1,
  };

  if (isRollingBack) {
    dialogOptions.title = "Rollback to Stable";
    dialogOptions.message =
      "The latest stable version of CALC Translation has been downloaded.";
    dialogOptions.detail = `Do you want to roll back to the stable version (${info.version}) now?`;
  } else {
    dialogOptions.title = "Update Available";
    dialogOptions.message =
      "A new version of CALC Translation has been downloaded.";
    dialogOptions.detail = `Do you want to install version ${info.version} now or on the next app start?`;
  }

  isRollingBack = false;

  dialog.showMessageBox(window, dialogOptions).then((result) => {
    if (result.response === 0) {
      autoUpdateLog.info("User chose 'Install Now'. Quitting and installing.");
      isUpdatePending = false;
      autoUpdater.quitAndInstall(false, true);
    } else {
      autoUpdateLog.info(
        "User chose 'Install on Next Start'. Update will be installed on next launch.",
      );
    }
  });
}

export function getIsUpdatePending() {
  return isUpdatePending;
}

export function getPendingUpdateInfo() {
  return lastUpdateInfo;
}

export function checkForUpdates() {
  autoUpdateLog.info(
    `Checking for updates on channel: ${autoUpdater.channel}...`,
  );
  autoUpdater.checkForUpdates();
}

export function setPrereleaseChannel(isBetaEnabled) {
  if (isBetaEnabled) {
    autoUpdater.allowPrerelease = true;
    autoUpdater.channel = "beta";
    autoUpdater.allowDowngrade = false;
    isRollingBack = false;
    autoUpdateLog.info(
      "Switched to BETA update channel (allowPrerelease: true).",
    );
  } else {
    autoUpdater.allowPrerelease = false;
    autoUpdater.channel = "latest";
    autoUpdater.allowDowngrade = true;
    isRollingBack = true;
    autoUpdateLog.info(
      "Switched to STABLE update channel (allowDowngrade: true).",
    );
  }
  checkForUpdates();
}
