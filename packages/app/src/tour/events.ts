export const TOUR_OPEN_USER_MENU_EVENT = "calc-tour:open-user-menu";
export const TOUR_OPEN_SETTINGS_EVENT = "calc-tour:open-settings";
export const TOUR_CLOSE_SHELL_OVERLAYS_EVENT = "calc-tour:close-shell-overlays";
export const TOUR_RESTART_DASHBOARD_EVENT = "calc-tour:restart-dashboard";

export function dispatchTourUiEvent(eventName: string) {
  const browser = globalThis as typeof globalThis & {
    dispatchEvent?: (event: Event) => boolean;
    CustomEvent?: typeof CustomEvent;
  };

  const CustomEventConstructor = browser.CustomEvent;
  if (!CustomEventConstructor) {
    return;
  }

  browser.dispatchEvent?.(new CustomEventConstructor(eventName));
}
