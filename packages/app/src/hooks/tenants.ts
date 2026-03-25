import useSWR, { useSWRConfig } from "swr";
import { apiRequest, ApiError, buildApiUrl } from "./api";
import { tenantsKey } from "./users";

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

export const tenantSettingsKey = (tenantId: string | null) =>
  tenantId ? buildApiUrl(`/tenants/${encodeURIComponent(tenantId)}/settings`) : null;
export const allTenantSettingsKey = () => buildApiUrl("/tenants/settings");

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
