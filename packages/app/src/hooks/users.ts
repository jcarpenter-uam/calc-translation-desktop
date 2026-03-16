import useSWR, { useSWRConfig } from "swr";
import { type AuthUser, type TenantInfo } from "../auth/authClient";
import { apiRequest, ApiError, buildApiUrl, withTenantQuery } from "./api";

type TenantUsersResponse = {
  users: AuthUser[];
};

type TenantsResponse = {
  tenants: TenantInfo[];
};

export type UpdateUserPayload = {
  name?: string | null;
  email?: string | null;
  languageCode?: string | null;
  role?: "user" | "tenant_admin" | "super_admin";
  tenantId?: string;
};

type UpdateUserResponse = {
  message: string;
  user: AuthUser;
};

type DeleteUserResponse = {
  message: string;
};

export const tenantsKey = () => buildApiUrl("/tenants/");

export const tenantUsersKey = (tenantId: string | null) =>
  tenantId
    ? buildApiUrl(`/users/?tenantId=${encodeURIComponent(tenantId)}`)
    : buildApiUrl("/users/");

/**
 * Lists available tenants for admin actions.
 */
export function useTenants(enabled: boolean) {
  return useSWR<TenantsResponse, ApiError>(
    enabled ? tenantsKey() : null,
    () => apiRequest<TenantsResponse>("/tenants/"),
    {
      revalidateOnFocus: false,
      shouldRetryOnError: (error: ApiError) => error.status >= 500,
    },
  );
}

/**
 * Lists users visible to tenant admins or super admins.
 */
export function useTenantUsers(enabled: boolean) {
  return useTenantUsersForTenant(null, enabled);
}

/**
 * Lists users visible to tenant admins or super admins for a tenant scope.
 */
export function useTenantUsersForTenant(
  tenantId: string | null,
  enabled: boolean,
) {
  const path = withTenantQuery("/users/", tenantId);
  const key = tenantUsersKey(tenantId);

  return useSWR<TenantUsersResponse, ApiError>(
    enabled ? key : null,
    () => apiRequest<TenantUsersResponse>(path),
    {
      revalidateOnFocus: false,
      shouldRetryOnError: (error: ApiError) => error.status >= 500,
    },
  );
}

/**
 * Updates a tenant user and refreshes cached user lists.
 */
export function useUpdateTenantUser() {
  const { mutate } = useSWRConfig();

  return async (
    id: string,
    payload: UpdateUserPayload,
    tenantId?: string | null,
  ) => {
    const path = withTenantQuery(`/users/${id}`, tenantId);
    const response = await apiRequest<UpdateUserResponse>(path, {
      method: "PATCH",
      body: JSON.stringify(payload),
    });

    await mutate<TenantUsersResponse>(
      tenantUsersKey(tenantId || null),
      (currentValue?: TenantUsersResponse) => {
        if (!currentValue) {
          return currentValue;
        }

        return {
          users: currentValue.users.map((existingUser: AuthUser) =>
            existingUser.id === id ? response.user : existingUser,
          ),
        };
      },
      { revalidate: false },
    );

    return response;
  };
}

/**
 * Soft deletes a tenant user and refreshes cached user lists.
 */
export function useDeleteTenantUser() {
  const { mutate } = useSWRConfig();

  return async (id: string, tenantId?: string | null) => {
    const path = withTenantQuery(`/users/${id}`, tenantId);
    const response = await apiRequest<DeleteUserResponse>(path, {
      method: "DELETE",
    });

    await mutate<TenantUsersResponse>(
      tenantUsersKey(tenantId || null),
      (currentValue?: TenantUsersResponse) => {
        if (!currentValue) {
          return currentValue;
        }

        return {
          users: currentValue.users.filter(
            (existingUser: AuthUser) => existingUser.id !== id,
          ),
        };
      },
      { revalidate: false },
    );

    return response;
  };
}
