import { BrowserWindow, dialog } from "electron";
import { autoUpdater } from "electron-updater";
import log from "electron-log/main";
import { getMainWindow } from "./windowmanager";

const autoUpdateLog = log.scope("autoupdate");

export function setupAutoUpdaterListeners() {
  autoUpdater.channel = "latest";
  autoUpdater.allowPrerelease = false;
  autoUpdater.autoDownload = true;

  autoUpdater.on("update-available", (info) => {
    autoUpdateLog.info("An update is available:", info.version);
  });

  autoUpdater.on("error", (err) => {
    autoUpdateLog.error("Error during update:", err);
  });

  autoUpdater.on("update-downloaded", (info) => {
    autoUpdateLog.info("Update downloaded. Prompting user...", info);

    const window = getMainWindow() || BrowserWindow.getAllWindows()[0];

    if (window) {
      dialog
        .showMessageBox(window, {
          type: "info",
          title: "Update Available",
          message: "A new version of CALC Translation has been downloaded.",
          detail: "Do you want to install it now or on the next app start?",
          buttons: ["Install Now", "Install on Next Start"],
          defaultId: 0,
          cancelId: 1,
        })
        .then((result) => {
          if (result.response === 0) {
            autoUpdateLog.info(
              "User chose 'Install Now'. Quitting and installing.",
            );
            autoUpdater.quitAndInstall(true);
          } else {
            autoUpdateLog.info(
              "User chose 'Install on Next Start'. Update will be installed on next launch.",
            );
          }
        });
    }
  });
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
    autoUpdateLog.info(
      "Switched to BETA update channel (allowPrerelease: true).",
    );
  } else {
    autoUpdater.allowPrerelease = false;
    autoUpdater.channel = "latest";
    autoUpdateLog.info(
      "Switched to STABLE update channel (allowPrerelease: false).",
    );
  }
  checkForUpdates();
}
