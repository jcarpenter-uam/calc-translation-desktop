import { contextBridge, ipcRenderer } from "electron";

contextBridge.exposeInMainWorld("electron", {
  // App Controls
  minimize: () => ipcRenderer.invoke("minimize-window"),
  maximize: () => ipcRenderer.invoke("maximize-window"),
  close: () => ipcRenderer.invoke("close-window"),
  setPrereleaseChannel: (isBeta) =>
    ipcRenderer.invoke("set-prerelease-channel", isBeta),
  getAppVersion: () => ipcRenderer.invoke("get-app-version"),
  toggleAlwaysOnTop: () => ipcRenderer.invoke("toggle-always-on-top"),
  writeToClipboard: (text) => ipcRenderer.invoke("clipboard-write", text),
  getDesktopSources: () => ipcRenderer.invoke("desktop:get-sources"),
  setStartOnBoot: (value) => ipcRenderer.send("set-start-on-boot", value),
  getStartOnBoot: () => ipcRenderer.invoke("get-start-on-boot"),
  getWindowBounds: () => ipcRenderer.invoke("get-window-bounds"),
  setWindowBounds: (bounds) => ipcRenderer.send("set-window-bounds", bounds),

  // Features
  downloadVtt: (payload) => ipcRenderer.invoke("download-vtt", payload),
  updateUserLanguage: (languageCode) =>
    ipcRenderer.invoke("users:update-language", languageCode),
  getLogs: () => ipcRenderer.invoke("admin:get-logs"),
  openOverlay: (routePath) => ipcRenderer.invoke("overlay:open", routePath),
  closeOverlay: () => ipcRenderer.invoke("overlay:close"),
  setIgnoreMouseEvents: (ignore, options) =>
    ipcRenderer.invoke("overlay:set-ignore-mouse-events", ignore, options),
  onOverlayStateChanged: (callback) => {
    const subscription = (_event, data) => callback(data);
    ipcRenderer.on("overlay-state-changed", subscription);
    return () => {
      ipcRenderer.removeListener("overlay-state-changed", subscription);
    };
  },
  syncSessionData: (data) => ipcRenderer.send("sync-session-data", data),
  onRestoreSessionData: (callback) => {
    const subscription = (_event, data) => callback(data);
    ipcRenderer.on("restore-session-data", subscription);
    return () => {
      ipcRenderer.removeListener("restore-session-data", subscription);
    };
  },

  // Calendar
  getCalendarEvents: (start, end) =>
    ipcRenderer.invoke("calendar:get-events", start, end),
  syncCalendar: () => ipcRenderer.invoke("calendar:sync"),
  joinCalendarSession: (payload) =>
    ipcRenderer.invoke("auth:join-calendar", payload),

  // Auth
  requestLogin: (email, language, provider) =>
    ipcRenderer.invoke("auth:request-login", email, language, provider),
  startAuthFlow: (url) => ipcRenderer.invoke("start-auth-flow", url),
  getUser: () => ipcRenderer.invoke("auth:get-user"),
  logout: () => ipcRenderer.invoke("auth:logout"),
  joinZoom: (payload) => ipcRenderer.invoke("auth:join-zoom", payload),
  joinStandalone: (payload) =>
    ipcRenderer.invoke("auth:join-standalone", payload),
  linkPendingZoom: () => ipcRenderer.invoke("auth:link-zoom"),

  // Admin: User Management
  getUsers: () => ipcRenderer.invoke("admin:get-users"),
  updateUser: (userId, data) =>
    ipcRenderer.invoke("admin:update-user", userId, data),
  deleteUser: (userId) => ipcRenderer.invoke("admin:delete-user", userId),
  setUserAdminStatus: (tenantId, data) =>
    ipcRenderer.invoke("admin:set-user-admin-status", tenantId, data),

  // Admin: Tenant Management
  getTenants: () => ipcRenderer.invoke("admin:get-tenants"),
  createTenant: (data) => ipcRenderer.invoke("admin:create-tenant", data),
  updateTenant: (tenantId, data) =>
    ipcRenderer.invoke("admin:update-tenant", tenantId, data),
  deleteTenant: (tenantId) =>
    ipcRenderer.invoke("admin:delete-tenant", tenantId),
});
