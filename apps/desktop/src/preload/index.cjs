const { contextBridge } = require("electron");

contextBridge.exposeInMainWorld("desktop", {
  platform: "desktop",
  osPlatform: process.platform,
  appVersion: process.env.npm_package_version || "unknown",
});
