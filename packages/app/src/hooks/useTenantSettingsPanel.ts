import { useEffect, useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import { useNotifications } from "../contexts/NotificationContext";
import { ApiError } from "./api";
import {
  useAllTenantSettings,
  useCreateTenant,
  useDeleteTenant,
  useTenantSettings,
  useUpdateTenantSettings,
  type TenantDomain,
  type TenantSettings,
  type UpdateTenantSettingsPayload,
} from "./tenants";

export type ProviderType = "google" | "entra";

export type ProviderDraft = {
  enabled: boolean;
  clientId: string;
  clientSecret: string;
  tenantHint: string;
  hasSecret: boolean;
  domains: string[];
};

export const PROVIDERS: ProviderType[] = ["google", "entra"];

/**
 * Flattens provider-specific domain inputs into the API payload shape.
 */
export function expandDomains(
  providerDrafts: Record<ProviderType, ProviderDraft>,
): TenantDomain[] {
  return PROVIDERS.flatMap((providerType) =>
    providerDrafts[providerType].domains
      .map((domain) => domain.trim().toLowerCase())
      .filter((domain) => domain)
      .map((domain) => ({
        domain,
        providerType,
      })),
  );
}

/**
 * Creates an empty editable draft for every supported identity provider.
 */
export function createEmptyProviderDrafts(): Record<ProviderType, ProviderDraft> {
  return {
    google: {
      enabled: false,
      clientId: "",
      clientSecret: "",
      tenantHint: "",
      hasSecret: false,
      domains: [""],
    },
    entra: {
      enabled: false,
      clientId: "",
      clientSecret: "",
      tenantHint: "",
      hasSecret: false,
      domains: [""],
    },
  };
}

/**
 * Rebuilds local form state from the persisted tenant settings payload.
 */
export function buildProviderDrafts(settings: TenantSettings) {
  const nextDrafts = createEmptyProviderDrafts();
  for (const config of settings.authConfigs) {
    const providerType = config.providerType as ProviderType;
    nextDrafts[providerType] = {
      enabled: true,
      clientId: config.clientId,
      clientSecret: "",
      tenantHint: config.tenantHint || "",
      hasSecret: config.hasSecret,
      domains: [],
    };
  }

  for (const domainEntry of settings.domains) {
    const providerType = domainEntry.providerType as ProviderType;
    if (!nextDrafts[providerType]) {
      continue;
    }
    nextDrafts[providerType].domains.push(domainEntry.domain);
  }

  for (const providerType of PROVIDERS) {
    if (nextDrafts[providerType].domains.length === 0) {
      nextDrafts[providerType].domains = [""];
    }
  }

  return nextDrafts;
}

/**
 * Encapsulates per-tenant editor state, validation, and save/delete orchestration.
 */
export function useTenantEditorCard({
  settings,
  onSave,
  onDelete,
  defaultCollapsed = false,
}: {
  settings: TenantSettings;
  onSave: (tenantId: string, payload: UpdateTenantSettingsPayload) => Promise<unknown>;
  onDelete?: (tenantId: string) => Promise<unknown>;
  defaultCollapsed?: boolean;
}) {
  const { notify } = useNotifications();
  const [organizationName, setOrganizationName] = useState(settings.tenant.name || "");
  const [providerDrafts, setProviderDrafts] = useState<Record<ProviderType, ProviderDraft>>(
    buildProviderDrafts(settings),
  );
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [confirmMode, setConfirmMode] = useState<"save" | "delete" | null>(null);
  const [isExpanded, setIsExpanded] = useState(!defaultCollapsed);

  const resetFromSettings = () => {
    setOrganizationName(settings.tenant.name || "");
    setProviderDrafts(buildProviderDrafts(settings));
  };

  useEffect(() => {
    resetFromSettings();
  }, [settings]);

  const setProviderDraft = (
    providerType: ProviderType,
    nextValue: Partial<ProviderDraft>,
  ) => {
    setProviderDrafts((currentValue) => ({
      ...currentValue,
      [providerType]: {
        ...currentValue[providerType],
        ...nextValue,
      },
    }));
  };

  const buildPayload = (): UpdateTenantSettingsPayload => ({
    organizationName: organizationName.trim() || null,
    domains: expandDomains(providerDrafts),
    authConfigs: PROVIDERS.filter((providerType) => providerDrafts[providerType].enabled).map(
      (providerType) => ({
        providerType,
        clientId: providerDrafts[providerType].clientId.trim(),
        clientSecret: providerDrafts[providerType].clientSecret.trim() || null,
        tenantHint:
          providerType === "entra"
            ? providerDrafts[providerType].tenantHint.trim() || null
            : null,
      }),
    ),
  });

  const validate = () => {
    const payload = buildPayload();
    if (payload.domains.length === 0) {
      setError("Add at least one domain.");
      return false;
    }
    if (payload.authConfigs.length === 0) {
      setError("Enable and configure at least one auth provider.");
      return false;
    }
    for (const config of payload.authConfigs) {
      if (!config.clientId) {
        setError(`Client ID is required for ${config.providerType}.`);
        return false;
      }
    }
    setError(null);
    return true;
  };

  const confirmSave = () => {
    if (validate()) {
      setConfirmMode("save");
    }
  };

  const confirmDelete = () => {
    setConfirmMode("delete");
  };

  const submitConfirm = async () => {
    if (confirmMode === "delete" && onDelete) {
      setIsDeleting(true);
      setError(null);
      try {
        await onDelete(settings.tenant.id);
        notify({
          title: "Tenant Deleted",
          message: "The tenant was removed successfully.",
          variant: "success",
        });
        setConfirmMode(null);
      } catch (err) {
        notify({
          title: "Delete Failed",
          message: err instanceof ApiError ? err.message : "Failed to delete tenant.",
          variant: "error",
        });
      } finally {
        setIsDeleting(false);
      }
      return;
    }

    setIsSaving(true);
    setError(null);
    try {
      await onSave(settings.tenant.id, buildPayload());
      setProviderDrafts((currentValue) => ({
        google: {
          ...currentValue.google,
          clientSecret: "",
          hasSecret: true,
        },
        entra: {
          ...currentValue.entra,
          clientSecret: "",
          hasSecret: true,
        },
      }));
      notify({
        title: "Tenant Updated",
        message: "Tenant settings were saved.",
        variant: "success",
      });
      setConfirmMode(null);
    } catch (err) {
      notify({
        title: "Save Failed",
        message: err instanceof ApiError ? err.message : "Failed to save tenant settings.",
        variant: "error",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const enabledProviderCount = PROVIDERS.filter(
    (providerType) => providerDrafts[providerType].enabled,
  ).length;
  const configuredDomainCount = expandDomains(providerDrafts).length;

  return {
    organizationName,
    setOrganizationName,
    providerDrafts,
    setProviderDrafts,
    setProviderDraft,
    error,
    setError,
    isSaving,
    isDeleting,
    confirmMode,
    setConfirmMode,
    isExpanded,
    setIsExpanded,
    resetFromSettings,
    enabledProviderCount,
    configuredDomainCount,
    confirmSave,
    confirmDelete,
    submitConfirm,
  };
}

/**
 * Encapsulates tenant settings queries plus create-tenant form state and mutations.
 */
export function useTenantSettingsPanel({
  selectedTenantId,
  isAllTenantsView,
  tenantOptions,
}: {
  selectedTenantId: string | null;
  isAllTenantsView: boolean;
  tenantOptions: Array<{ id: string; name: string | null }>;
}) {
  const { user, tenantId } = useAuth();
  const { notify } = useNotifications();
  const isSuperAdmin = user?.role === "super_admin";
  const isTenantAdmin = user?.role === "tenant_admin";
  const isAdmin = isSuperAdmin || isTenantAdmin;

  const [isCreating, setIsCreating] = useState(false);
  const [newTenantId, setNewTenantId] = useState("");
  const [organizationName, setOrganizationName] = useState("");
  const [providerDrafts, setProviderDrafts] = useState<Record<ProviderType, ProviderDraft>>(
    createEmptyProviderDrafts,
  );
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [confirmCreateOpen, setConfirmCreateOpen] = useState(false);

  const effectiveTenantId = selectedTenantId || tenantId;
  const selectedTenantLabel =
    tenantOptions.find((entry) => entry.id === effectiveTenantId)?.name ||
    effectiveTenantId ||
    "current tenant";

  const singleSettingsQuery = useTenantSettings(
    effectiveTenantId || null,
    isAdmin && !isCreating && !isAllTenantsView && Boolean(effectiveTenantId),
  );
  const allSettingsQuery = useAllTenantSettings(isAdmin && isAllTenantsView);
  const updateTenantSettings = useUpdateTenantSettings();
  const createTenant = useCreateTenant();
  const deleteTenant = useDeleteTenant();

  const buildCreatePayload = (): UpdateTenantSettingsPayload => ({
    organizationName: organizationName.trim() || null,
    domains: expandDomains(providerDrafts),
    authConfigs: PROVIDERS.filter((providerType) => providerDrafts[providerType].enabled).map(
      (providerType) => ({
        providerType,
        clientId: providerDrafts[providerType].clientId.trim(),
        clientSecret: providerDrafts[providerType].clientSecret.trim() || null,
        tenantHint:
          providerType === "entra"
            ? providerDrafts[providerType].tenantHint.trim() || null
            : null,
      }),
    ),
  });

  const validateCreate = () => {
    const payload = buildCreatePayload();
    if (!newTenantId.trim()) {
      setError("Tenant ID is required.");
      return false;
    }
    if (payload.domains.length === 0) {
      setError("Add at least one domain.");
      return false;
    }
    if (payload.authConfigs.length === 0) {
      setError("Enable and configure at least one auth provider.");
      return false;
    }
    for (const config of payload.authConfigs) {
      if (!config.clientId) {
        setError(`Client ID is required for ${config.providerType}.`);
        return false;
      }
      if (!config.clientSecret) {
        setError(`Client secret is required for ${config.providerType} when creating a tenant.`);
        return false;
      }
    }
    setError(null);
    return true;
  };

  const toggleCreate = () => {
    setIsCreating((currentValue) => !currentValue);
    setError(null);
  };

  const confirmCreate = () => {
    if (validateCreate()) {
      setConfirmCreateOpen(true);
    }
  };

  const submitCreate = async () => {
    setIsSaving(true);
    setError(null);
    try {
      await createTenant({
        tenantId: newTenantId.trim(),
        ...buildCreatePayload(),
      });
      setNewTenantId("");
      setOrganizationName("");
      setProviderDrafts(createEmptyProviderDrafts());
      setIsCreating(false);
      notify({
        title: "Tenant Created",
        message: "The new tenant is ready to use.",
        variant: "success",
      });
      setConfirmCreateOpen(false);
    } catch (err) {
      notify({
        title: "Create Failed",
        message: err instanceof ApiError ? err.message : "Failed to create tenant.",
        variant: "error",
      });
    } finally {
      setIsSaving(false);
    }
  };

  return {
    isAdmin,
    isSuperAdmin,
    isAllTenantsView,
    isCreating,
    toggleCreate,
    newTenantId,
    setNewTenantId,
    organizationName,
    setOrganizationName,
    providerDrafts,
    setProviderDrafts,
    error,
    setError,
    isSaving,
    confirmCreateOpen,
    setConfirmCreateOpen,
    selectedTenantLabel,
    singleSettingsQuery,
    allSettingsQuery,
    updateTenantSettings,
    deleteTenant,
    confirmCreate,
    submitCreate,
  };
}
