import useSWR, { useSWRConfig } from "swr";
import { type AuthUser, type MeResponse } from "../auth/authClient";
import { apiRequest, ApiError, buildApiUrl } from "./api";

type UpdateMeResponse = {
  message: string;
  user: AuthUser;
};

export const currentUserKey = () => buildApiUrl("/user/me");

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
