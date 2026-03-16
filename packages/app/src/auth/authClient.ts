export type AuthUser = {
  id: string;
  name: string | null;
  email: string | null;
  role: string;
  languageCode: string | null;
};

export type TenantInfo = {
  id: string;
  name: string | null;
};

export type MeResponse = {
  user: AuthUser;
  tenant: TenantInfo | null;
};

export function getApiBaseUrl() {
  const env = globalThis as typeof globalThis & {
    __APP_API_BASE_URL__?: string;
  };

  return env.__APP_API_BASE_URL__ || "/api";
}

export function startLogin(email: string, returnTo: string) {
  const browser = globalThis as typeof globalThis & {
    location: {
      origin: string;
      assign: (url: string) => void;
    };
  };

  const loginUrl = new URL(
    `${getApiBaseUrl()}/auth/login`,
    browser.location.origin,
  );
  loginUrl.searchParams.set("email", email);
  loginUrl.searchParams.set("returnTo", returnTo);
  browser.location.assign(loginUrl.toString());
}

export async function logout() {
  const response = await fetch(`${getApiBaseUrl()}/auth/logout`, {
    method: "POST",
    credentials: "include",
  });

  if (!response.ok) {
    throw new Error(`Failed to logout: ${response.status}`);
  }
}
