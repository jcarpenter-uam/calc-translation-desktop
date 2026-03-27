import { useEffect, useState } from "react";
import { ConfirmDialog } from "../general/ConfirmDialog";
import {
  type TenantSettings,
  type UpdateTenantSettingsPayload,
} from "../hooks/tenants";
import {
  PROVIDERS,
  type ProviderType,
  useTenantEditorCard,
  useTenantSettingsPanel,
} from "../hooks/useTenantSettingsPanel";

type TenantSettingsPanelProps = {
  selectedTenantId: string | null;
  isAllTenantsView: boolean;
  tenantOptions: Array<{ id: string; name: string | null }>;
};

type TenantEditorCardProps = {
  settings: TenantSettings;
  allowDelete: boolean;
  onSave: (
    tenantId: string,
    payload: UpdateTenantSettingsPayload,
  ) => Promise<unknown>;
  onDelete?: (tenantId: string) => Promise<unknown>;
  collapsible?: boolean;
  defaultCollapsed?: boolean;
};

/**
 * Editable tenant settings card used for both single-tenant and all-tenant admin views.
 */
function TenantEditorCard({
  settings,
  allowDelete,
  onSave,
  onDelete,
  collapsible = false,
  defaultCollapsed = false,
}: TenantEditorCardProps) {
  const {
    organizationName,
    setOrganizationName,
    providerDrafts,
    setProviderDraft,
    error,
    isSaving,
    isDeleting,
    confirmMode,
    setConfirmMode,
    isExpanded,
    setIsExpanded,
    enabledProviderCount,
    configuredDomainCount,
    confirmSave,
    confirmDelete,
    submitConfirm,
  } = useTenantEditorCard({
    settings,
    onSave,
    onDelete,
    defaultCollapsed,
  });

  return (
    <div className="space-y-4 rounded-2xl border border-line/70 bg-panel/40 p-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-ink-muted">
            Tenant
          </p>
          <h3 className="mt-1 text-lg font-semibold text-ink">
            {settings.tenant.name || settings.tenant.id}
          </h3>
          <p className="mt-1 text-sm text-ink-muted">{settings.tenant.id}</p>
        </div>

        <div className="flex flex-wrap gap-2 text-sm">
          {collapsible ? (
            <button
              type="button"
              onClick={() => setIsExpanded((currentValue) => !currentValue)}
              className="rounded-xl border border-line px-3 py-2 font-semibold text-ink transition hover:border-lime hover:text-lime"
            >
              {isExpanded ? "Collapse" : "Expand"}
            </button>
          ) : null}
        </div>
      </div>

      {error ? (
        <p className="rounded-lg border border-red-400/40 bg-red-500/10 px-3 py-2 text-sm text-ink">
          {error}
        </p>
      ) : null}

      {!isExpanded ? (
        <div className="grid gap-3 md:grid-cols-3">
          <div className="rounded-xl border border-line/70 bg-canvas/60 px-3 py-3">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-ink-muted">
              Tenant ID
            </p>
            <p className="mt-1 text-sm font-semibold text-ink">
              {settings.tenant.id}
            </p>
          </div>
          <div className="rounded-xl border border-line/70 bg-canvas/60 px-3 py-3">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-ink-muted">
              Domains
            </p>
            <p className="mt-1 text-sm font-semibold text-ink">
              {configuredDomainCount} configured
            </p>
          </div>
          <div className="rounded-xl border border-line/70 bg-canvas/60 px-3 py-3">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-ink-muted">
              Providers
            </p>
            <p className="mt-1 text-sm font-semibold text-ink">
              {enabledProviderCount} enabled
            </p>
          </div>
        </div>
      ) : null}

      {isExpanded ? (
        <>
          <div className="grid gap-4 lg:grid-cols-2">
            {PROVIDERS.map((providerType) => {
              const draft = providerDrafts[providerType];
              const isEntra = providerType === "entra";

              return (
                <div
                  key={`${settings.tenant.id}-${providerType}`}
                  className="space-y-3 rounded-xl border border-line/70 bg-canvas/60 p-4"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <h4 className="text-sm font-semibold capitalize text-ink">
                        {providerType} Provider
                      </h4>
                      <p className="text-sm text-ink-muted">
                        {isEntra
                          ? "Configure Microsoft Entra SSO credentials."
                          : "Configure Google SSO credentials."}
                      </p>
                    </div>
                    <label className="flex items-center gap-2 text-sm text-ink">
                      <input
                        type="checkbox"
                        checked={draft.enabled}
                        onChange={(event: any) =>
                          setProviderDraft(providerType, {
                            enabled: Boolean(event.target.checked),
                          })
                        }
                      />
                      Enabled
                    </label>
                  </div>

                  <label className="block space-y-1">
                    <span className="text-xs font-semibold uppercase tracking-[0.12em] text-ink-muted">
                      Domains
                    </span>
                    <div className="space-y-2 rounded-lg border border-line bg-panel p-3">
                      <p className="text-xs text-ink-muted">
                        Use the same domain in multiple provider sections to show a provider chooser at sign-in.
                      </p>
                      {draft.domains.map((domain, domainIndex) => (
                        <div key={`${settings.tenant.id}-${providerType}-${domainIndex}`} className="flex gap-2">
                          <input
                            value={domain}
                            onChange={(event: any) =>
                              setProviderDraft(providerType, {
                                domains: draft.domains.map((entry, entryIndex) =>
                                  entryIndex === domainIndex ? String(event.target.value) : entry,
                                ),
                              })
                            }
                            disabled={!draft.enabled}
                            placeholder="example.com"
                            className="w-full rounded-lg border border-line bg-canvas px-3 py-2 text-sm text-ink focus:border-lime focus:outline-none focus:ring-4 focus:ring-lime/20 disabled:cursor-not-allowed disabled:opacity-50"
                          />
                          <button
                            type="button"
                            onClick={() =>
                              setProviderDraft(providerType, {
                                domains:
                                  draft.domains.filter((_, entryIndex) => entryIndex !== domainIndex)
                                    .length > 0
                                    ? draft.domains.filter((_, entryIndex) => entryIndex !== domainIndex)
                                    : [""],
                              })
                            }
                            disabled={!draft.enabled}
                            className="rounded-lg border border-red-400/40 px-3 py-2 text-xs font-semibold text-red-300 transition hover:border-red-400/70 hover:text-red-200 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            Remove
                          </button>
                        </div>
                      ))}
                      <button
                        type="button"
                        onClick={() => setProviderDraft(providerType, { domains: [...draft.domains, ""] })}
                        disabled={!draft.enabled}
                        className="rounded-lg border border-line px-3 py-2 text-xs font-semibold text-ink transition hover:border-lime hover:text-lime disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        Add Domain
                      </button>
                    </div>
                  </label>

                  <label className="block space-y-1">
                    <span className="text-xs font-semibold uppercase tracking-[0.12em] text-ink-muted">
                      Client ID
                    </span>
                    <input
                      value={draft.clientId}
                      onChange={(event: any) =>
                        setProviderDraft(providerType, {
                          clientId: String(event.target.value),
                        })
                      }
                      disabled={!draft.enabled}
                      className="w-full rounded-lg border border-line bg-panel px-3 py-2 text-sm text-ink focus:border-lime focus:outline-none focus:ring-4 focus:ring-lime/20 disabled:cursor-not-allowed disabled:opacity-50"
                    />
                  </label>

                  <label className="block space-y-1">
                    <span className="text-xs font-semibold uppercase tracking-[0.12em] text-ink-muted">
                      Client Secret
                    </span>
                    <input
                      value={draft.clientSecret}
                      onChange={(event: any) =>
                        setProviderDraft(providerType, {
                          clientSecret: String(event.target.value),
                        })
                      }
                      disabled={!draft.enabled}
                      placeholder={
                        draft.hasSecret
                          ? "Leave blank to keep existing secret"
                          : "Paste client secret"
                      }
                      className="w-full rounded-lg border border-line bg-panel px-3 py-2 text-sm text-ink focus:border-lime focus:outline-none focus:ring-4 focus:ring-lime/20 disabled:cursor-not-allowed disabled:opacity-50"
                    />
                  </label>

                  {isEntra ? (
                    <label className="block space-y-1">
                      <span className="text-xs font-semibold uppercase tracking-[0.12em] text-ink-muted">
                        Tenant Hint
                      </span>
                      <input
                        value={draft.tenantHint}
                        onChange={(event: any) =>
                          setProviderDraft(providerType, {
                            tenantHint: String(event.target.value),
                          })
                        }
                        disabled={!draft.enabled}
                        placeholder="common or tenant GUID"
                        className="w-full rounded-lg border border-line bg-panel px-3 py-2 text-sm text-ink focus:border-lime focus:outline-none focus:ring-4 focus:ring-lime/20 disabled:cursor-not-allowed disabled:opacity-50"
                      />
                    </label>
                  ) : null}
                </div>
              );
            })}
          </div>

          <div className="flex flex-wrap justify-end gap-2">
            {allowDelete && onDelete ? (
              <button
                type="button"
                onClick={() => setConfirmMode("delete")}
                className="rounded-lg border border-red-400/40 px-4 py-2 text-sm font-semibold text-red-300 transition hover:border-red-400/70 hover:text-red-200"
              >
                Delete Tenant
              </button>
            ) : null}
             <button
               type="button"
               onClick={confirmSave}
               className="rounded-lg border border-line px-4 py-2 text-sm font-semibold text-ink transition hover:border-lime hover:text-lime"
             >
               Save Changes
            </button>
          </div>

          <ConfirmDialog
            isOpen={Boolean(confirmMode)}
            title={
              confirmMode === "delete"
                ? "Delete tenant?"
                : "Save tenant settings?"
            }
            description={
              confirmMode === "delete"
                ? `Delete ${settings.tenant.name || settings.tenant.id} and remove its tenant-scoped data?`
                : `Save the current tenant settings for ${settings.tenant.name || settings.tenant.id}?`
            }
            confirmLabel={
              confirmMode === "delete" ? "Delete Tenant" : "Save Changes"
            }
            tone={confirmMode === "delete" ? "danger" : "default"}
            isBusy={isSaving || isDeleting}
            onConfirm={() => {
              void submitConfirm();
            }}
            onClose={() => {
              if (!isSaving && !isDeleting) {
                setConfirmMode(null);
              }
            }}
          />
        </>
      ) : null}
    </div>
  );
}

export function TenantSettingsPanel({
  selectedTenantId,
  isAllTenantsView,
  tenantOptions,
}: TenantSettingsPanelProps) {
  const {
    isAdmin,
    isSuperAdmin,
    isAllTenantsView: isAllTenantsMode,
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
  } = useTenantSettingsPanel({
    selectedTenantId,
    isAllTenantsView,
    tenantOptions,
  });

  if (!isAdmin) {
    return null;
  }

  return (
    <div className="space-y-4 rounded-xl border border-line bg-canvas p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-ink-muted">
            Tenant Settings
          </p>
          <h2 className="mt-1 text-lg font-semibold text-ink">
            Domains and sign-in setup
          </h2>
          <p className="mt-1 text-sm text-ink-muted">
            {isAllTenantsMode
              ? "View and manage every tenant directly from this page-wide overview."
              : isSuperAdmin
                ? `Configure routing and provider credentials for ${selectedTenantLabel}.`
                : "Keep your tenant's domains and SSO provider settings current."}
          </p>
        </div>

        {isSuperAdmin && isAllTenantsMode ? (
          <button
            type="button"
            onClick={toggleCreate}
            className="rounded-lg border border-line px-3 py-2 text-sm font-semibold text-ink transition hover:border-lime hover:text-lime"
          >
            {isCreating ? "Close Create" : "Add Tenant"}
          </button>
        ) : null}
      </div>

      {error ? (
        <p className="rounded-lg border border-red-400/40 bg-red-500/10 px-3 py-2 text-sm text-ink">
          {error}
        </p>
      ) : null}

      {isCreating ? (
        <div className="space-y-5 rounded-2xl border border-line/70 bg-panel/40 p-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-ink-muted">
              Create Tenant
            </p>
            <h3 className="mt-1 text-lg font-semibold text-ink">New tenant</h3>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <label className="space-y-1">
              <span className="text-xs font-semibold uppercase tracking-[0.12em] text-ink-muted">
                Tenant ID
              </span>
              <input
                value={newTenantId}
                onChange={(event: any) =>
                  setNewTenantId(String(event.target.value))
                }
                placeholder="tenant-acme"
                className="w-full rounded-lg border border-line bg-panel px-3 py-2 text-sm text-ink focus:border-lime focus:outline-none focus:ring-4 focus:ring-lime/20"
              />
            </label>

            <label className="space-y-1">
              <span className="text-xs font-semibold uppercase tracking-[0.12em] text-ink-muted">
                Organization Name
              </span>
              <input
                value={organizationName}
                onChange={(event: any) =>
                  setOrganizationName(String(event.target.value))
                }
                placeholder="Acme Corporation"
                className="w-full rounded-lg border border-line bg-panel px-3 py-2 text-sm text-ink focus:border-lime focus:outline-none focus:ring-4 focus:ring-lime/20"
              />
            </label>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            {PROVIDERS.map((providerType) => {
              const draft = providerDrafts[providerType];
              const isEntra = providerType === "entra";
              return (
                <div
                  key={`create-${providerType}`}
                  className="space-y-3 rounded-xl border border-line/70 bg-canvas/60 p-4"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <h4 className="text-sm font-semibold capitalize text-ink">
                        {providerType} Provider
                      </h4>
                      <p className="text-sm text-ink-muted">
                        {isEntra
                          ? "Configure Microsoft Entra SSO credentials."
                          : "Configure Google SSO credentials."}
                      </p>
                    </div>
                    <label className="flex items-center gap-2 text-sm text-ink">
                      <input
                        type="checkbox"
                        checked={draft.enabled}
                        onChange={(event: any) =>
                          setProviderDrafts((currentValue) => ({
                            ...currentValue,
                            [providerType]: {
                              ...currentValue[providerType],
                              enabled: Boolean(event.target.checked),
                            },
                          }))
                        }
                      />
                      Enabled
                    </label>
                  </div>
                  <label className="block space-y-1">
                    <span className="text-xs font-semibold uppercase tracking-[0.12em] text-ink-muted">
                      Domains
                    </span>
                    <div className="space-y-2 rounded-lg border border-line bg-panel p-3">
                      <p className="text-xs text-ink-muted">
                        Use the same domain in multiple provider sections to show a provider chooser at sign-in.
                      </p>
                      {draft.domains.map((domain, domainIndex) => (
                        <div key={`create-${providerType}-${domainIndex}`} className="flex gap-2">
                          <input
                            value={domain}
                            onChange={(event: any) =>
                              setProviderDrafts((currentValue) => ({
                                ...currentValue,
                                [providerType]: {
                                  ...currentValue[providerType],
                                  domains: currentValue[providerType].domains.map((entry, entryIndex) =>
                                    entryIndex === domainIndex ? String(event.target.value) : entry,
                                  ),
                                },
                              }))
                            }
                            disabled={!draft.enabled}
                            placeholder="example.com"
                            className="w-full rounded-lg border border-line bg-canvas px-3 py-2 text-sm text-ink focus:border-lime focus:outline-none focus:ring-4 focus:ring-lime/20 disabled:cursor-not-allowed disabled:opacity-50"
                          />
                          <button
                            type="button"
                            onClick={() =>
                              setProviderDrafts((currentValue) => ({
                                ...currentValue,
                                [providerType]: {
                                  ...currentValue[providerType],
                                  domains:
                                    currentValue[providerType].domains.filter((_, entryIndex) => entryIndex !== domainIndex).length > 0
                                      ? currentValue[providerType].domains.filter((_, entryIndex) => entryIndex !== domainIndex)
                                      : [""],
                                },
                              }))
                            }
                            disabled={!draft.enabled}
                            className="rounded-lg border border-red-400/40 px-3 py-2 text-xs font-semibold text-red-300 transition hover:border-red-400/70 hover:text-red-200 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            Remove
                          </button>
                        </div>
                      ))}
                      <button
                        type="button"
                        onClick={() =>
                          setProviderDrafts((currentValue) => ({
                            ...currentValue,
                            [providerType]: {
                              ...currentValue[providerType],
                              domains: [...currentValue[providerType].domains, ""],
                            },
                          }))
                        }
                        disabled={!draft.enabled}
                        className="rounded-lg border border-line px-3 py-2 text-xs font-semibold text-ink transition hover:border-lime hover:text-lime disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        Add Domain
                      </button>
                    </div>
                  </label>
                  <input
                    value={draft.clientId}
                    onChange={(event: any) =>
                      setProviderDrafts((currentValue) => ({
                        ...currentValue,
                        [providerType]: {
                          ...currentValue[providerType],
                          clientId: String(event.target.value),
                        },
                      }))
                    }
                    disabled={!draft.enabled}
                    placeholder="Client ID"
                    className="w-full rounded-lg border border-line bg-panel px-3 py-2 text-sm text-ink focus:border-lime focus:outline-none focus:ring-4 focus:ring-lime/20 disabled:cursor-not-allowed disabled:opacity-50"
                  />
                  <input
                    value={draft.clientSecret}
                    onChange={(event: any) =>
                      setProviderDrafts((currentValue) => ({
                        ...currentValue,
                        [providerType]: {
                          ...currentValue[providerType],
                          clientSecret: String(event.target.value),
                        },
                      }))
                    }
                    disabled={!draft.enabled}
                    placeholder="Client Secret"
                    className="w-full rounded-lg border border-line bg-panel px-3 py-2 text-sm text-ink focus:border-lime focus:outline-none focus:ring-4 focus:ring-lime/20 disabled:cursor-not-allowed disabled:opacity-50"
                  />
                  {isEntra ? (
                    <input
                      value={draft.tenantHint}
                      onChange={(event: any) =>
                        setProviderDrafts((currentValue) => ({
                          ...currentValue,
                          [providerType]: {
                            ...currentValue[providerType],
                            tenantHint: String(event.target.value),
                          },
                        }))
                      }
                      disabled={!draft.enabled}
                      placeholder="Tenant Hint"
                      className="w-full rounded-lg border border-line bg-panel px-3 py-2 text-sm text-ink focus:border-lime focus:outline-none focus:ring-4 focus:ring-lime/20 disabled:cursor-not-allowed disabled:opacity-50"
                    />
                  ) : null}
                </div>
              );
            })}
          </div>

          <div className="flex justify-end">
            <button
              type="button"
              onClick={confirmCreate}
              disabled={isSaving}
              className="rounded-lg border border-line px-4 py-2 text-sm font-semibold text-ink transition hover:border-lime hover:text-lime disabled:cursor-not-allowed disabled:opacity-50"
            >
              Create Tenant
            </button>
          </div>
        </div>
      ) : null}

      {isAllTenantsMode ? (
        allSettingsQuery.isLoading ? (
          <p className="text-sm text-ink-muted">Loading tenant settings...</p>
        ) : (
          <div className="space-y-4">
            {(allSettingsQuery.data?.tenants || []).map((settings) => (
              <TenantEditorCard
                key={settings.tenant.id}
                settings={settings}
                allowDelete={true}
                onSave={updateTenantSettings}
                onDelete={deleteTenant}
                collapsible={true}
                defaultCollapsed={true}
              />
            ))}
          </div>
        )
      ) : singleSettingsQuery.isLoading ? (
        <p className="text-sm text-ink-muted">Loading tenant settings...</p>
      ) : singleSettingsQuery.data ? (
        <TenantEditorCard
          settings={singleSettingsQuery.data}
          allowDelete={isSuperAdmin}
          onSave={updateTenantSettings}
          onDelete={isSuperAdmin ? deleteTenant : undefined}
          collapsible={false}
          defaultCollapsed={false}
        />
      ) : null}

      <ConfirmDialog
        isOpen={confirmCreateOpen}
        title="Create tenant?"
        description={`Create tenant ${newTenantId.trim() || "(missing id)"} with the current routing and provider settings?`}
        confirmLabel="Create Tenant"
        tone="default"
        isBusy={isSaving}
        onConfirm={() => {
          void submitCreate();
        }}
        onClose={() => {
          if (!isSaving) {
            setConfirmCreateOpen(false);
          }
        }}
      />
    </div>
  );
}
