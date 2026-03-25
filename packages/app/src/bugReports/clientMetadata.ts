import type { ClientType } from "../app/AppInfoContext";

type ClientMetadata = {
  clientType: ClientType;
  osPlatform: "windows" | "linux" | "macos" | "unknown";
  appVersion: string;
  browserName: string | null;
  browserVersion: string | null;
  userAgent: string | null;
};

function resolveAppVersion() {
  const browser = globalThis as typeof globalThis & {
    process?: {
      env?: {
        npm_package_version?: string;
      };
    };
    desktop?: {
      appVersion?: string;
    };
  };

  return (
    browser.desktop?.appVersion ||
    browser.process?.env?.npm_package_version ||
    "unknown"
  );
}

function detectOsFromValue(value: string | null | undefined) {
  const normalizedValue = (value || "").toLowerCase();

  if (normalizedValue.includes("win")) {
    return "windows" as const;
  }

  if (normalizedValue.includes("linux") || normalizedValue.includes("x11")) {
    return "linux" as const;
  }

  if (
    normalizedValue.includes("mac") ||
    normalizedValue.includes("ios") ||
    normalizedValue.includes("iphone") ||
    normalizedValue.includes("ipad")
  ) {
    return "macos" as const;
  }

  return "unknown" as const;
}

function detectBrowser(userAgent: string) {
  const patterns = [
    { name: "Edge", regex: /Edg\/([^\s]+)/ },
    { name: "Chrome", regex: /Chrome\/([^\s]+)/ },
    { name: "Firefox", regex: /Firefox\/([^\s]+)/ },
    { name: "Safari", regex: /Version\/([^\s]+).*Safari/ },
  ];

  for (const pattern of patterns) {
    const match = userAgent.match(pattern.regex);
    if (match?.[1]) {
      return {
        browserName: pattern.name,
        browserVersion: match[1],
      };
    }
  }

  return {
    browserName: null,
    browserVersion: null,
  };
}

/**
 * Collects normalized client metadata for bug report submissions.
 */
export function collectClientMetadata(clientType: ClientType): ClientMetadata {
  const browser = globalThis as typeof globalThis & {
    navigator?: {
      userAgent?: string;
      platform?: string;
      userAgentData?: {
        platform?: string;
      };
    };
    desktop?: {
      osPlatform?: string;
    };
  };
  const userAgent = browser.navigator?.userAgent || null;
  const browserDetails = userAgent ? detectBrowser(userAgent) : {
    browserName: null,
    browserVersion: null,
  };

  const osPlatform =
    clientType === "desktop"
      ? detectOsFromValue(browser.desktop?.osPlatform)
      : detectOsFromValue(
          browser.navigator?.userAgentData?.platform ||
            browser.navigator?.platform ||
            browser.navigator?.userAgent,
        );

  return {
    clientType,
    osPlatform,
    appVersion: resolveAppVersion(),
    browserName: browserDetails.browserName,
    browserVersion: browserDetails.browserVersion,
    userAgent,
  };
}
