import { Menu } from "electron";
import { getMainWindow } from "./windowmanager";
import log from "electron-log/main";

const appMenuLog = log.scope("appmenu");

export function createApplicationMenu() {
  const menuTemplate = [
    {
      label: "View",
      submenu: [
        { role: "reload" },
        { role: "forceReload" },
        { role: "toggleDevTools" },
        {
          label: "Reset Window Size",
          accelerator: "CmdOrCtrl+Shift+R",
          click: () => {
            const defaultWidth = 800;
            const defaultHeight = 300;
            const mainWindow = getMainWindow();

            if (mainWindow) {
              const currentBounds = mainWindow.getBounds();
              if (
                currentBounds.width !== defaultWidth ||
                currentBounds.height !== defaultHeight
              ) {
                appMenuLog.info("Resetting window size to default");
                mainWindow.setBounds({
                  width: defaultWidth,
                  height: defaultHeight,
                });
              }
            } else {
              appMenuLog.warn(
                "Could not reset window size, main window not found.",
              );
            }
          },
        },
      ],
    },
  ];

  appMenuLog.info("Creating application menu.");
  const menu = Menu.buildFromTemplate(menuTemplate);
  Menu.setApplicationMenu(menu);
}
