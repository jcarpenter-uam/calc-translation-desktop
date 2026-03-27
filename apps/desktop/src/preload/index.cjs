const { contextBridge } = require("electron");
const path = require("node:path");

const { version } = require(path.join(__dirname, "../../../../package.json"));

contextBridge.exposeInMainWorld("desktop", {
  platform: "desktop",
  osPlatform: process.platform,
  appVersion: version || "unknown",
});
