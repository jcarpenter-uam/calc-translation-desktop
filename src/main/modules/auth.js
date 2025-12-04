import { BrowserWindow, session } from "electron";
import log from "electron-log/main";

const authLog = log.scope("auth");

export function createAuthWindow(loginUrl) {
  return new Promise((resolve, reject) => {
    let authWindow = new BrowserWindow({
      width: 600,
      height: 700,
      show: false,
      autoHideMenuBar: true,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
      },
    });

    authWindow.loadURL(loginUrl);
    authWindow.show();

    const { session: currentSession } = authWindow.webContents;

    authWindow.webContents.on("did-redirect-navigation", (event, url) => {
      handleNavigation(url);
    });

    authWindow.webContents.on("will-navigate", (event, url) => {
      handleNavigation(url);
    });

    function handleNavigation(url) {
      try {
        const parsedUrl = new URL(url);
        if (parsedUrl.pathname === "/" && !parsedUrl.searchParams.get("code")) {
          authLog.info("Authentication successful, detected redirect to root.");

          currentSession.cookies
            .get({ name: "app_auth_token" })
            .then((cookies) => {
              if (cookies.length > 0) {
                authLog.info("Auth token cookie found.");
                resolve({ status: "success" });
              } else {
                authLog.warn("Redirected to root but auth cookie missing.");
                resolve({ status: "success" });
              }
              if (authWindow) {
                authWindow.close();
              }
            })
            .catch((err) => {
              authLog.error("Error checking cookies:", err);
              resolve({ status: "success" });
              if (authWindow) {
                authWindow.close();
              }
            });
        }
      } catch (error) {
        authLog.error("Error parsing URL during navigation:", error);
      }
    }

    authWindow.on("closed", () => {
      authWindow = null;
      reject(new Error("Auth window closed by user"));
    });
  });
}
