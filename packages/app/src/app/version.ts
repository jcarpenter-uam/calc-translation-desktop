/**
 * Resolves the shared frontend version injected by the current shell.
 */
export function getFrontendVersion() {
  const browser = globalThis as typeof globalThis & {
    __APP_VERSION__?: string;
    desktop?: {
      appVersion?: string;
    };
  };

  return browser.desktop?.appVersion || browser.__APP_VERSION__ || "unknown";
}
