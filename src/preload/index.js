import { contextBridge, ipcRenderer } from "electron";

contextBridge.exposeInMainWorld("electron", {
  minimize: () => ipcRenderer.invoke("minimize-window"),
  maximize: () => ipcRenderer.invoke("maximize-window"),
  close: () => ipcRenderer.invoke("close-window"),
  setPrereleaseChannel: (isBeta) =>
    ipcRenderer.invoke("set-prerelease-channel", isBeta),
  getAppVersion: () => ipcRenderer.invoke("get-app-version"),
  toggleAlwaysOnTop: () => ipcRenderer.invoke("toggle-always-on-top"),
  downloadVtt: () => ipcRenderer.invoke("download-vtt"),
  requestLogin: (email) => ipcRenderer.invoke("auth:request-login", email),
  startAuthFlow: (url) => ipcRenderer.invoke("start-auth-flow", url),
  getUser: () => ipcRenderer.invoke("auth:get-user"),
  logout: () => ipcRenderer.invoke("auth:logout"),
  joinZoom: (payload) => ipcRenderer.invoke("auth:join-zoom", payload),
  joinTest: (payload) => ipcRenderer.invoke("auth:join-test", payload),
  linkPendingZoom: () => ipcRenderer.invoke("auth:link-zoom"),
});
