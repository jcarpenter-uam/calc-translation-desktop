import useSWR, { useSWRConfig } from "swr";
import { apiRequest, ApiError, buildApiUrl } from "./api";

export type AuthUser = {
  id: string;
  name: string | null;
  email: string | null;
  role: string;
  languageCode: string | null;
  tenantId?: string | null;
  tenantName?: string | null;
};

export type TenantInfo = {
  id: string;
  name: string | null;
};

export type MeResponse = {
  user: AuthUser;
  tenant: TenantInfo | null;
};

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

type UpdateMeResponse = {
  message: string;
  user: AuthUser;
};

export const currentUserKey = () => buildApiUrl("/user/me");

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

/**
 * Returns the authenticated user profile.
 */
export function useCurrentUser() {
  return useSWR<MeResponse, ApiError>(
    currentUserKey(),
    () => apiRequest<MeResponse>("/user/me"),
    {
      revalidateOnFocus: true,
      shouldRetryOnError: (error: ApiError) => error.status >= 500,
    },
  );
}

/**
 * Optimistically updates the current user's language preference.
 */
export function useUpdateMyLanguage() {
  const { cache, mutate } = useSWRConfig();

  return async (languageCode: string) => {
    const cacheKey = currentUserKey();
    const snapshot = cache.get(cacheKey)?.data as MeResponse | undefined;

    if (snapshot) {
      await mutate<MeResponse>(
        cacheKey,
        {
          ...snapshot,
          user: {
            ...snapshot.user,
            languageCode,
          },
        },
        { revalidate: false },
      );
    }

    try {
      const response = await apiRequest<UpdateMeResponse>("/user/me", {
        method: "PATCH",
        body: JSON.stringify({ languageCode }),
      });

      const latest = (cache.get(cacheKey)?.data || snapshot) as
        | MeResponse
        | undefined;

      if (latest) {
        await mutate<MeResponse>(
          cacheKey,
          {
            ...latest,
            user: response.user,
          },
          { revalidate: false },
        );
      }
    } catch (error) {
      if (snapshot) {
        await mutate<MeResponse>(cacheKey, snapshot, { revalidate: false });
      }
      throw error;
    }
  };
}
