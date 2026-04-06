import { ConfirmDialog } from "../general/ConfirmDialog";
import { useI18n } from "../contexts/UiI18nContext";
import {
  type AdminRole,
  type ManagedUser,
  useUserSettingsPanel,
} from "../hooks/useUserSettingsPanel";
import { getLanguageLabel } from "../languages/LanguageList";

type UserSettingsPanelProps = {
  selectedTenantId: string | null;
  isAllTenantsView: boolean;
  tenantOptions: Array<{ id: string; name: string | null }>;
};

/**
 * Admin panel for searching users, adjusting roles, and removing tenant access.
 */
export function UserSettingsPanel({
  selectedTenantId,
  isAllTenantsView,
  tenantOptions,
}: UserSettingsPanelProps) {
  const { locale, t } = useI18n();
  const {
    isAdmin,
    isSuperAdmin,
    search,
    setSearch,
    isSaving,
    isDeleting,
    editingUserId,
    editRole,
    setEditRole,
    confirmState,
    setConfirmState,
    filteredUsers,
    isUsersLoading,
    tenantLabel,
    roleOptions,
    startEdit,
    cancelEdit,
    requestSaveConfirmation,
    requestDeleteConfirmation,
    saveUserRole,
    deleteUser,
  } = useUserSettingsPanel({
    selectedTenantId,
    isAllTenantsView,
    tenantOptions,
  });

  if (!isAdmin) {
    return null;
  }

  return (
    <div className="space-y-4 rounded-xl border border-line bg-canvas p-4">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-ink-muted">
          {t("admin.users.section")}
        </p>
        <h2 className="mt-1 text-lg font-semibold text-ink">
          {t("admin.users.title")}
        </h2>
        <p className="mt-1 text-sm text-ink-muted">
          {isAllTenantsView
            ? t("admin.users.subtitleAll")
            : isSuperAdmin
              ? t("admin.users.subtitleTenantAdmin", { tenant: tenantLabel })
              : t("admin.users.subtitleTenant")}
        </p>
      </div>

      <label className="block space-y-1">
        <span className="text-xs font-semibold uppercase tracking-[0.12em] text-ink-muted">
          {t("admin.users.search")}
        </span>
        <input
          value={search}
          onChange={(event: any) => setSearch(String(event.target.value))}
          placeholder={t("admin.users.searchPlaceholder")}
          className="w-full rounded-lg border border-line bg-panel px-3 py-2 text-sm text-ink placeholder:text-ink-muted focus:border-lime focus:outline-none focus:ring-4 focus:ring-lime/20"
        />
      </label>

      <div className="overflow-hidden rounded-xl border border-line bg-panel/40">
        <div className="max-h-80 overflow-auto">
          {isUsersLoading ? (
            <p className="p-4 text-sm text-ink-muted">{t("admin.users.loading")}</p>
          ) : filteredUsers.length === 0 ? (
            <p className="p-4 text-sm text-ink-muted">{t("admin.users.empty")}</p>
          ) : (
            <>
              <div className="divide-y divide-line/70 md:hidden">
                {filteredUsers.map((entry) => {
                  const isEditing = editingUserId === entry.id;

                  return (
                    <div key={`${entry.tenantId || "tenant"}-${entry.id}`} className="space-y-3 px-4 py-4">
                      <div>
                        <p className="font-semibold text-ink">{entry.name || t("admin.users.unknown")}</p>
                        <p className="text-sm text-ink-muted">{entry.email || t("admin.users.noEmail")}</p>
                      </div>

                      {isAllTenantsView ? (
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-ink-muted">{t("admin.users.tenant")}</p>
                          <p className="mt-1 text-sm font-semibold text-ink">{entry.tenantName || entry.tenantId || t("admin.users.unknownTenant")}</p>
                          <p className="text-xs text-ink-muted">{entry.tenantId || t("admin.users.na")}</p>
                        </div>
                      ) : null}

                      <div className="grid gap-3 sm:grid-cols-2">
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-ink-muted">{t("admin.users.role")}</p>
                          <div className="mt-1">
                            {isEditing ? (
                              <select
                                value={editRole}
                                onChange={(event: any) => setEditRole(String(event.target.value) as AdminRole)}
                                className="w-full rounded-lg border border-line bg-panel px-2 py-1.5 text-sm text-ink focus:border-lime focus:outline-none focus:ring-4 focus:ring-lime/20"
                              >
                                {roleOptions.map((role) => (
                                  <option key={role} value={role}>{role}</option>
                                ))}
                              </select>
                            ) : (
                              <span className="inline-flex rounded-full border border-line/70 bg-canvas px-2.5 py-1 text-xs font-semibold text-ink">{entry.role}</span>
                            )}
                          </div>
                        </div>

                        <div>
                          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-ink-muted">{t("admin.users.language")}</p>
                          <p className="mt-1 text-sm text-ink">{entry.languageCode ? getLanguageLabel(entry.languageCode, locale) : t("admin.users.na")}</p>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        {isEditing ? (
                          <>
                            <button type="button" onClick={requestSaveConfirmation} disabled={isSaving} className="rounded-md border border-line px-2 py-1 text-xs font-semibold transition hover:border-lime hover:text-lime disabled:cursor-not-allowed disabled:opacity-50">{t("admin.users.save")}</button>
                            <button type="button" onClick={cancelEdit} className="rounded-md border border-line px-2 py-1 text-xs font-semibold transition hover:border-lime hover:text-lime">{t("common.cancel")}</button>
                          </>
                        ) : (
                          <>
                            <button type="button" onClick={() => startEdit(entry as ManagedUser)} className="rounded-md border border-line px-2 py-1 text-xs font-semibold transition hover:border-lime hover:text-lime">{t("admin.users.editRole")}</button>
                            <button type="button" onClick={() => requestDeleteConfirmation(entry as ManagedUser)} className="rounded-md border border-red-400/40 px-2 py-1 text-xs font-semibold text-red-300 transition hover:border-red-400/70 hover:text-red-200">{t("admin.users.delete")}</button>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              <table className="hidden min-w-full table-fixed md:table">
                <thead className="border-b border-line/70 bg-panel text-left text-xs font-semibold uppercase tracking-[0.12em] text-ink-muted">
                  <tr>
                    <th className="w-[34%] px-4 py-3">{t("admin.users.user")}</th>
                    {isAllTenantsView ? <th className="w-[22%] px-4 py-3">{t("admin.users.tenant")}</th> : null}
                    <th className="w-[16%] px-4 py-3">{t("admin.users.role")}</th>
                    <th className="w-[12%] px-4 py-3">{t("admin.users.language")}</th>
                    <th className="w-[16%] px-4 py-3 text-right">{t("admin.users.actions")}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line/70">
                  {filteredUsers.map((entry) => {
                    const isEditing = editingUserId === entry.id;

                    return (
                      <tr key={`${entry.tenantId || "tenant"}-${entry.id}`} className="align-top">
                        <td className="px-4 py-4">
                          <p className="font-semibold text-ink">{entry.name || t("admin.users.unknown")}</p>
                          <p className="text-sm text-ink-muted">{entry.email || t("admin.users.noEmail")}</p>
                        </td>
                        {isAllTenantsView ? (
                          <td className="px-4 py-4">
                            <p className="text-sm font-semibold text-ink">{entry.tenantName || entry.tenantId || t("admin.users.unknownTenant")}</p>
                            <p className="text-xs text-ink-muted">{entry.tenantId || t("admin.users.na")}</p>
                          </td>
                        ) : null}
                        <td className="px-4 py-4">
                          {isEditing ? (
                            <select
                              value={editRole}
                              onChange={(event: any) => setEditRole(String(event.target.value) as AdminRole)}
                              className="w-full rounded-lg border border-line bg-panel px-2 py-1.5 text-sm text-ink focus:border-lime focus:outline-none focus:ring-4 focus:ring-lime/20"
                            >
                              {roleOptions.map((role) => (
                                <option key={role} value={role}>{role}</option>
                              ))}
                            </select>
                          ) : (
                            <span className="inline-flex rounded-full border border-line/70 bg-canvas px-2.5 py-1 text-xs font-semibold text-ink">{entry.role}</span>
                          )}
                        </td>
                        <td className="px-4 py-4 text-sm text-ink">{entry.languageCode ? getLanguageLabel(entry.languageCode, locale) : t("admin.users.na")}</td>
                        <td className="px-4 py-4">
                          <div className="flex justify-end gap-2">
                            {isEditing ? (
                              <>
                                <button type="button" onClick={requestSaveConfirmation} disabled={isSaving} className="rounded-md border border-line px-2 py-1 text-xs font-semibold transition hover:border-lime hover:text-lime disabled:cursor-not-allowed disabled:opacity-50">{t("admin.users.save")}</button>
                                <button type="button" onClick={cancelEdit} className="rounded-md border border-line px-2 py-1 text-xs font-semibold transition hover:border-lime hover:text-lime">{t("common.cancel")}</button>
                              </>
                            ) : (
                              <>
                                <button type="button" onClick={() => startEdit(entry as ManagedUser)} className="rounded-md border border-line px-2 py-1 text-xs font-semibold transition hover:border-lime hover:text-lime">{t("admin.users.editRole")}</button>
                                <button type="button" onClick={() => requestDeleteConfirmation(entry as ManagedUser)} className="rounded-md border border-red-400/40 px-2 py-1 text-xs font-semibold text-red-300 transition hover:border-red-400/70 hover:text-red-200">{t("admin.users.delete")}</button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </>
          )}
        </div>
      </div>

      <ConfirmDialog
        isOpen={Boolean(confirmState)}
        title={
          confirmState?.type === "delete"
            ? t("admin.users.deleteUserTitle")
            : t("admin.users.saveRoleTitle")
        }
        description={
          confirmState?.type === "delete"
            ? t("admin.users.deleteUserDescription", {
                user: confirmState.userName,
              })
            : confirmState
              ? t("admin.users.saveRoleDescription", {
                  user: confirmState.userName,
                  currentRole: confirmState.currentRole,
                  nextRole: confirmState.nextRole,
                })
              : ""
        }
        confirmLabel={
          confirmState?.type === "delete" ? t("admin.users.deleteUser") : t("admin.tenants.saveChanges")
        }
        cancelLabel={t("common.cancel")}
        tone={confirmState?.type === "delete" ? "danger" : "default"}
        isBusy={isSaving || isDeleting}
        onConfirm={() => {
          if (!confirmState) {
            return;
          }
          void (confirmState.type === "save"
            ? saveUserRole(confirmState.userId, confirmState.nextRole)
            : deleteUser(confirmState.userId));
        }}
        onClose={() => {
          if (!isSaving && !isDeleting) {
            setConfirmState(null);
          }
        }}
      />
    </div>
  );
}
