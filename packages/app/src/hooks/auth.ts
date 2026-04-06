import { apiRequest, buildApiUrl } from "./api";

export type LoginChoiceOption = {
  tenantId: string;
  tenantName: string | null;
  providerType: "google" | "entra";
};

export type LoginResult =
  | {
      mode: "redirect";
      url: string;
    }
  | {
      mode: "select_provider";
      email: string;
      options: LoginChoiceOption[];
    };

/**
 * Starts the SSO login flow for the provided email.
 */
export async function startLogin(email: string, returnTo: string) {
  const browser = globalThis as typeof globalThis & {
    location: {
      assign: (url: string) => void;
    };
  };

  const response = await apiRequest<LoginResult>("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, returnTo }),
  });

  if (response.mode === "redirect") {
    browser.location.assign(response.url);
  }

  return response;
}

/**
 * Continues SSO login after the user selects a provider.
 */
export async function chooseLoginProvider(
  email: string,
  tenantId: string,
  providerType: "google" | "entra",
  returnTo: string,
) {
  const browser = globalThis as typeof globalThis & {
    location: {
      assign: (url: string) => void;
    };
  };

  const response = await apiRequest<{ mode: "redirect"; url: string }>(
    "/auth/login/choose",
    {
      method: "POST",
      body: JSON.stringify({ email, tenantId, providerType, returnTo }),
    },
  );

  browser.location.assign(response.url);
}

/**
 * Terminates the current API session.
 */
export async function logout() {
  const response = await fetch(buildApiUrl("/auth/logout"), {
    method: "POST",
    credentials: "include",
  });

  if (!response.ok) {
    throw new Error(`Failed to logout: ${response.status}`);
  }
}
