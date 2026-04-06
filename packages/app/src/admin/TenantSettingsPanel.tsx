import { useI18n } from "../contexts/UiI18nContext";
import { ConfirmDialog } from "../general/ConfirmDialog";
import {
  type TenantSettings,
  type UpdateTenantSettingsPayload,
} from "../hooks/tenants";
import {
  PROVIDERS,
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
  const { t } = useI18n();
  const {
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
            {t("admin.tenants.tenant")}
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
              {isExpanded ? t("admin.tenants.collapse") : t("admin.tenants.expand")}
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
               {t("admin.tenants.tenantId")}
            </p>
            <p className="mt-1 text-sm font-semibold text-ink">
              {settings.tenant.id}
            </p>
          </div>
          <div className="rounded-xl border border-line/70 bg-canvas/60 px-3 py-3">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-ink-muted">
               {t("admin.tenants.domains")}
            </p>
            <p className="mt-1 text-sm font-semibold text-ink">
               {t("admin.tenants.configuredCount", { count: configuredDomainCount })}
            </p>
          </div>
          <div className="rounded-xl border border-line/70 bg-canvas/60 px-3 py-3">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-ink-muted">
               {t("admin.tenants.providers")}
            </p>
            <p className="mt-1 text-sm font-semibold text-ink">
               {t("admin.tenants.enabledCount", { count: enabledProviderCount })}
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
                         {t("admin.tenants.providerTitle", { provider: providerType })}
                       </h4>
                       <p className="text-sm text-ink-muted">
                         {isEntra
                           ? t("admin.tenants.entraDescription")
                           : t("admin.tenants.googleDescription")}
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
                       {t("admin.tenants.enabled")}
                     </label>
                  </div>

                  <label className="block space-y-1">
                    <span className="text-xs font-semibold uppercase tracking-[0.12em] text-ink-muted">
                       {t("admin.tenants.domains")}
                    </span>
                    <div className="space-y-2 rounded-lg border border-line bg-panel p-3">
                      <p className="text-xs text-ink-muted">
                        {t("admin.tenants.domainHint")}
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
                            placeholder={t("admin.tenants.domainPlaceholder")}
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
                            {t("admin.tenants.remove")}
                          </button>
                        </div>
                      ))}
                      <button
                        type="button"
                        onClick={() => setProviderDraft(providerType, { domains: [...draft.domains, ""] })}
                        disabled={!draft.enabled}
                        className="rounded-lg border border-line px-3 py-2 text-xs font-semibold text-ink transition hover:border-lime hover:text-lime disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {t("admin.tenants.addDomain")}
                      </button>
                    </div>
                  </label>

                  <label className="block space-y-1">
                    <span className="text-xs font-semibold uppercase tracking-[0.12em] text-ink-muted">
                       {t("admin.tenants.clientId")}
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
                       {t("admin.tenants.clientSecret")}
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
                          ? t("admin.tenants.keepExistingSecret")
                          : t("admin.tenants.pasteClientSecret")
                      }
                      className="w-full rounded-lg border border-line bg-panel px-3 py-2 text-sm text-ink focus:border-lime focus:outline-none focus:ring-4 focus:ring-lime/20 disabled:cursor-not-allowed disabled:opacity-50"
                    />
                  </label>

                  {isEntra ? (
                    <label className="block space-y-1">
                      <span className="text-xs font-semibold uppercase tracking-[0.12em] text-ink-muted">
                         {t("admin.tenants.tenantHint")}
                      </span>
                      <input
                        value={draft.tenantHint}
                        onChange={(event: any) =>
                          setProviderDraft(providerType, {
                            tenantHint: String(event.target.value),
                          })
                        }
                        disabled={!draft.enabled}
                         placeholder={t("admin.tenants.tenantHintPlaceholder")}
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
                 {t("admin.tenants.deleteTenant")}
               </button>
            ) : null}
             <button
               type="button"
               onClick={confirmSave}
               className="rounded-lg border border-line px-4 py-2 text-sm font-semibold text-ink transition hover:border-lime hover:text-lime"
             >
                {t("admin.tenants.saveChanges")}
             </button>
          </div>

          <ConfirmDialog
            isOpen={Boolean(confirmMode)}
            title={
              confirmMode === "delete"
                 ? t("admin.tenants.deleteTenantTitle")
                 : t("admin.tenants.saveTenantTitle")
             }
             description={
               confirmMode === "delete"
                 ? t("admin.tenants.deleteTenantDescription", {
                     tenant: settings.tenant.name || settings.tenant.id,
                   })
                 : t("admin.tenants.saveTenantDescription", {
                     tenant: settings.tenant.name || settings.tenant.id,
                   })
             }
             confirmLabel={
               confirmMode === "delete" ? t("admin.tenants.deleteTenant") : t("admin.tenants.saveChanges")
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
  const { t } = useI18n();
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
            {t("admin.tenants.section")}
          </p>
          <h2 className="mt-1 text-lg font-semibold text-ink">
            {t("admin.tenants.title")}
          </h2>
          <p className="mt-1 text-sm text-ink-muted">
            {isAllTenantsMode
              ? t("admin.tenants.subtitleAll")
              : isSuperAdmin
                ? t("admin.tenants.subtitleTenantAdmin", { tenant: selectedTenantLabel })
                : t("admin.tenants.subtitleTenant")}
          </p>
        </div>

        {isSuperAdmin && isAllTenantsMode ? (
          <button
            type="button"
            onClick={toggleCreate}
            className="rounded-lg border border-line px-3 py-2 text-sm font-semibold text-ink transition hover:border-lime hover:text-lime"
          >
            {isCreating ? t("admin.tenants.closeCreate") : t("admin.tenants.addTenant")}
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
              {t("admin.tenants.createTenant")}
            </p>
            <h3 className="mt-1 text-lg font-semibold text-ink">{t("admin.tenants.newTenant")}</h3>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <label className="space-y-1">
              <span className="text-xs font-semibold uppercase tracking-[0.12em] text-ink-muted">
                 {t("admin.tenants.tenantId")}
              </span>
              <input
                value={newTenantId}
                onChange={(event: any) =>
                  setNewTenantId(String(event.target.value))
                }
                 placeholder={t("admin.tenants.tenantIdPlaceholder")}
                className="w-full rounded-lg border border-line bg-panel px-3 py-2 text-sm text-ink focus:border-lime focus:outline-none focus:ring-4 focus:ring-lime/20"
              />
            </label>

            <label className="space-y-1">
              <span className="text-xs font-semibold uppercase tracking-[0.12em] text-ink-muted">
                 {t("admin.tenants.organizationName")}
              </span>
              <input
                value={organizationName}
                onChange={(event: any) =>
                  setOrganizationName(String(event.target.value))
                }
                 placeholder={t("admin.tenants.organizationPlaceholder")}
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
                         {t("admin.tenants.providerTitle", { provider: providerType })}
                      </h4>
                      <p className="text-sm text-ink-muted">
                        {isEntra
                           ? t("admin.tenants.entraDescription")
                           : t("admin.tenants.googleDescription")}
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
                       {t("admin.tenants.enabled")}
                    </label>
                  </div>
                  <label className="block space-y-1">
                    <span className="text-xs font-semibold uppercase tracking-[0.12em] text-ink-muted">
                       {t("admin.tenants.domains")}
                    </span>
                    <div className="space-y-2 rounded-lg border border-line bg-panel p-3">
                      <p className="text-xs text-ink-muted">
                         {t("admin.tenants.domainHint")}
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
                             placeholder={t("admin.tenants.domainPlaceholder")}
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
                             {t("admin.tenants.remove")}
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
                         {t("admin.tenants.addDomain")}
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
                    placeholder={t("admin.tenants.clientId")}
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
                    placeholder={t("admin.tenants.clientSecret")}
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
                      placeholder={t("admin.tenants.tenantHint")}
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
               {t("admin.tenants.createTenant")}
             </button>
          </div>
        </div>
      ) : null}

      {isAllTenantsMode ? (
        allSettingsQuery.isLoading ? (
          <p className="text-sm text-ink-muted">{t("admin.tenants.loading")}</p>
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
        <p className="text-sm text-ink-muted">{t("admin.tenants.loading")}</p>
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
        title={t("admin.tenants.createTenantTitle")}
        description={t("admin.tenants.createTenantDescription", {
          tenant: newTenantId.trim() || t("admin.tenants.missingId"),
        })}
        confirmLabel={t("admin.tenants.createTenant")}
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
