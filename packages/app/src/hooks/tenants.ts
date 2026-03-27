import useSWR, { useSWRConfig } from "swr";
import { apiRequest, ApiError, buildApiUrl } from "./api";
import { type AuthUser, type TenantInfo } from "./user";

export type TenantDomain = {
  domain: string;
  providerType: "google" | "entra";
};

export type TenantAuthConfig = {
  providerType: "google" | "entra";
  clientId: string;
  tenantHint: string | null;
  hasSecret: boolean;
};

export type TenantSettings = {
  tenant: {
    id: string;
    name: string | null;
  };
  domains: TenantDomain[];
  authConfigs: TenantAuthConfig[];
};

type AllTenantSettingsResponse = {
  tenants: TenantSettings[];
};

export type UpdateTenantSettingsPayload = {
  organizationName: string | null;
  domains: TenantDomain[];
  authConfigs: Array<{
    providerType: "google" | "entra";
    clientId: string;
    clientSecret?: string | null;
    tenantHint?: string | null;
  }>;
};

type UpdateTenantSettingsResponse = TenantSettings & {
  message: string;
};

type CreateTenantPayload = UpdateTenantSettingsPayload & {
  tenantId: string;
};

type CreateTenantResponse = TenantSettings & {
  message: string;
};

type DeleteTenantResponse = {
  message: string;
};

type TenantUsersResponse = {
  users: AuthUser[];
  pageInfo?: {
    limit: number;
    offset: number;
    returned: number;
    hasMore: boolean;
  };
};

type TenantsResponse = {
  tenants: TenantInfo[];
};

export type UpdateUserPayload = {
  role?: "user" | "tenant_admin" | "super_admin";
};

type UpdateUserResponse = {
  message: string;
  user: AuthUser;
};

type DeleteUserResponse = {
  message: string;
};

export const tenantsKey = () => buildApiUrl("/tenants/");

function buildTenantUsersPath(
  tenantId: string,
  options?: { q?: string | null },
) {
  const query = new URLSearchParams();
  const searchValue = options?.q?.trim();
  if (searchValue) {
    query.set("q", searchValue);
  }

  const suffix = query.toString();
  return `/tenants/${encodeURIComponent(tenantId)}/users${suffix ? `?${suffix}` : ""}`;
}

function buildAllTenantUsersPath(options?: { q?: string | null }) {
  const query = new URLSearchParams();
  const searchValue = options?.q?.trim();
  if (searchValue) {
    query.set("q", searchValue);
  }

  const suffix = query.toString();
  return `/tenants/users${suffix ? `?${suffix}` : ""}`;
}

export const tenantUsersKey = (
  tenantId: string | null,
  options?: { q?: string | null },
) => {
  if (!tenantId) {
    return null;
  }

  return buildApiUrl(buildTenantUsersPath(tenantId, options));
};

export const allTenantUsersKey = (options?: { q?: string | null }) =>
  buildApiUrl(buildAllTenantUsersPath(options));

export const tenantSettingsKey = (tenantId: string | null) =>
  tenantId ? buildApiUrl(`/tenants/${encodeURIComponent(tenantId)}/settings`) : null;
export const allTenantSettingsKey = () => buildApiUrl("/tenants/settings");

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
 * Lists users across all tenants for super-admin overview mode.
 */
export function useAllTenantUsers(enabled: boolean, options?: { q?: string | null }) {
  const key = enabled ? allTenantUsersKey(options) : null;

  return useSWR<TenantUsersResponse, ApiError>(
    key,
    () => apiRequest<TenantUsersResponse>(buildAllTenantUsersPath(options)),
    {
      revalidateOnFocus: false,
      shouldRetryOnError: (error: ApiError) => error.status >= 500,
    },
  );
}

/**
 * Lists users visible to tenant admins or super admins for a tenant scope.
 */
export function useTenantUsersForTenant(
  tenantId: string | null,
  enabled: boolean,
  options?: { q?: string | null },
) {
  const key = tenantUsersKey(tenantId, options);

  return useSWR<TenantUsersResponse, ApiError>(
    enabled && key ? key : null,
    () => apiRequest<TenantUsersResponse>(buildTenantUsersPath(tenantId!, options)),
    {
      revalidateOnFocus: false,
      shouldRetryOnError: (error: ApiError) => error.status >= 500,
    },
  );
}

/**
 * Loads editable settings for a tenant.
 */
export function useTenantSettings(tenantId: string | null, enabled: boolean) {
  const key = tenantSettingsKey(tenantId);

  return useSWR<TenantSettings, ApiError>(
    enabled && key ? key : null,
    () => apiRequest<TenantSettings>(`/tenants/${encodeURIComponent(tenantId!)}/settings`),
    {
      revalidateOnFocus: false,
      shouldRetryOnError: (error: ApiError) => error.status >= 500,
    },
  );
}

/**
 * Loads editable settings for all tenants.
 */
export function useAllTenantSettings(enabled: boolean) {
  return useSWR<AllTenantSettingsResponse, ApiError>(
    enabled ? allTenantSettingsKey() : null,
    () => apiRequest<AllTenantSettingsResponse>("/tenants/settings"),
    {
      revalidateOnFocus: false,
      shouldRetryOnError: (error: ApiError) => error.status >= 500,
    },
  );
}

/**
 * Updates a tenant's settings and refreshes caches.
 */
export function useUpdateTenantSettings() {
  const { mutate } = useSWRConfig();

  return async (tenantId: string, payload: UpdateTenantSettingsPayload) => {
    const response = await apiRequest<UpdateTenantSettingsResponse>(
      `/tenants/${encodeURIComponent(tenantId)}/settings`,
      {
        method: "PATCH",
        body: JSON.stringify(payload),
      },
    );

    await mutate(tenantSettingsKey(tenantId), response, { revalidate: false });
    await mutate<AllTenantSettingsResponse>(
      allTenantSettingsKey(),
      (currentValue?: AllTenantSettingsResponse) => {
        if (!currentValue) {
          return currentValue;
        }

        return {
          tenants: currentValue.tenants.map((tenant) =>
            tenant.tenant.id === tenantId ? response : tenant,
          ),
        };
      },
      { revalidate: false },
    );
    await mutate(tenantsKey());

    return response;
  };
}

/**
 * Creates a tenant and refreshes admin tenant discovery.
 */
export function useCreateTenant() {
  const { mutate } = useSWRConfig();

  return async (payload: CreateTenantPayload) => {
    const response = await apiRequest<CreateTenantResponse>("/tenants/", {
      method: "POST",
      body: JSON.stringify(payload),
    });

    await mutate(tenantSettingsKey(response.tenant.id), response, { revalidate: false });
    await mutate<AllTenantSettingsResponse>(
      allTenantSettingsKey(),
      (currentValue?: AllTenantSettingsResponse) => ({
        tenants: [...(currentValue?.tenants || []), response],
      }),
      { revalidate: false },
    );
    await mutate(tenantsKey());

    return response;
  };
}

/**
 * Deletes a tenant and refreshes cached tenant settings.
 */
export function useDeleteTenant() {
  const { mutate } = useSWRConfig();

  return async (tenantId: string) => {
    const response = await apiRequest<DeleteTenantResponse>(
      `/tenants/${encodeURIComponent(tenantId)}`,
      {
        method: "DELETE",
      },
    );

    await mutate(tenantSettingsKey(tenantId), undefined, { revalidate: false });
    await mutate<AllTenantSettingsResponse>(
      allTenantSettingsKey(),
      (currentValue?: AllTenantSettingsResponse) => {
        if (!currentValue) {
          return currentValue;
        }

        return {
          tenants: currentValue.tenants.filter((tenant) => tenant.tenant.id !== tenantId),
        };
      },
      { revalidate: false },
    );
    await mutate(tenantsKey());

    return response;
  };
}

/**
 * Updates a tenant user and refreshes cached user lists.
 */
export function useUpdateTenantUser() {
  const { mutate } = useSWRConfig();

  return async (id: string, payload: UpdateUserPayload, tenantId: string) => {
    const path = `/tenants/${encodeURIComponent(tenantId)}/users/${encodeURIComponent(id)}`;
    const response = await apiRequest<UpdateUserResponse>(path, {
      method: "PATCH",
      body: JSON.stringify(payload),
    });

    const tenantUsersPrefix = buildApiUrl(`/tenants/${encodeURIComponent(tenantId)}/users`);

    await mutate<TenantUsersResponse>(
      (key: unknown) => typeof key === "string" && key.startsWith(tenantUsersPrefix),
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

    await mutate<TenantUsersResponse>(
      (key: unknown) => typeof key === "string" && key.startsWith(buildApiUrl("/tenants/users")),
      (currentValue?: TenantUsersResponse) => {
        if (!currentValue) {
          return currentValue;
        }

        return {
          users: currentValue.users.map((existingUser: AuthUser) =>
            existingUser.id === id && existingUser.tenantId === tenantId
              ? { ...existingUser, ...response.user, tenantId, tenantName: existingUser.tenantName }
              : existingUser,
          ),
          pageInfo: currentValue.pageInfo,
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

  return async (id: string, tenantId: string) => {
    const path = `/tenants/${encodeURIComponent(tenantId)}/users/${encodeURIComponent(id)}`;
    const response = await apiRequest<DeleteUserResponse>(path, {
      method: "DELETE",
    });

    const tenantUsersPrefix = buildApiUrl(`/tenants/${encodeURIComponent(tenantId)}/users`);

    await mutate<TenantUsersResponse>(
      (key: unknown) => typeof key === "string" && key.startsWith(tenantUsersPrefix),
      (currentValue?: TenantUsersResponse) => {
        if (!currentValue) {
          return currentValue;
        }

        return {
          users: currentValue.users.filter((existingUser: AuthUser) => existingUser.id !== id),
        };
      },
      { revalidate: false },
    );

    await mutate<TenantUsersResponse>(
      (key: unknown) => typeof key === "string" && key.startsWith(buildApiUrl("/tenants/users")),
      (currentValue?: TenantUsersResponse) => {
        if (!currentValue) {
          return currentValue;
        }

        return {
          users: currentValue.users.filter(
            (existingUser: AuthUser) =>
              !(existingUser.id === id && existingUser.tenantId === tenantId),
          ),
          pageInfo: currentValue.pageInfo,
        };
      },
      { revalidate: false },
    );

    return response;
  };
}
