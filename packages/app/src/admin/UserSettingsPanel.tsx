import { ConfirmDialog } from "../general/ConfirmDialog";
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
          User Settings
        </p>
        <h2 className="mt-1 text-lg font-semibold text-ink">
          User access and roles
        </h2>
        <p className="mt-1 text-sm text-ink-muted">
          {isAllTenantsView
            ? "See users across every tenant, then update roles or remove access directly from the overview."
            : isSuperAdmin
              ? `Review who belongs to ${tenantLabel} and adjust access without touching profile data.`
              : "Keep your tenant roster tidy and assign the right level of access."}
        </p>
      </div>

      <label className="block space-y-1">
        <span className="text-xs font-semibold uppercase tracking-[0.12em] text-ink-muted">
          Search Users
        </span>
        <input
          value={search}
          onChange={(event: any) => setSearch(String(event.target.value))}
          placeholder="Search by name, email, or tenant"
          className="w-full rounded-lg border border-line bg-panel px-3 py-2 text-sm text-ink placeholder:text-ink-muted focus:border-lime focus:outline-none focus:ring-4 focus:ring-lime/20"
        />
      </label>

      <div className="overflow-hidden rounded-xl border border-line bg-panel/40">
        <div className="max-h-80 overflow-auto">
          {isUsersLoading ? (
            <p className="p-4 text-sm text-ink-muted">Loading users...</p>
          ) : filteredUsers.length === 0 ? (
            <p className="p-4 text-sm text-ink-muted">No users found.</p>
          ) : (
            <>
              <div className="divide-y divide-line/70 md:hidden">
                {filteredUsers.map((entry) => {
                  const isEditing = editingUserId === entry.id;

                  return (
                    <div key={`${entry.tenantId || "tenant"}-${entry.id}`} className="space-y-3 px-4 py-4">
                      <div>
                        <p className="font-semibold text-ink">{entry.name || "Unknown"}</p>
                        <p className="text-sm text-ink-muted">{entry.email || "No email"}</p>
                      </div>

                      {isAllTenantsView ? (
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-ink-muted">Tenant</p>
                          <p className="mt-1 text-sm font-semibold text-ink">{entry.tenantName || entry.tenantId || "Unknown tenant"}</p>
                          <p className="text-xs text-ink-muted">{entry.tenantId || "n/a"}</p>
                        </div>
                      ) : null}

                      <div className="grid gap-3 sm:grid-cols-2">
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-ink-muted">Role</p>
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
                          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-ink-muted">Language</p>
                          <p className="mt-1 text-sm text-ink">{entry.languageCode ? getLanguageLabel(entry.languageCode) : "n/a"}</p>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        {isEditing ? (
                          <>
                            <button type="button" onClick={requestSaveConfirmation} disabled={isSaving} className="rounded-md border border-line px-2 py-1 text-xs font-semibold transition hover:border-lime hover:text-lime disabled:cursor-not-allowed disabled:opacity-50">Save</button>
                            <button type="button" onClick={cancelEdit} className="rounded-md border border-line px-2 py-1 text-xs font-semibold transition hover:border-lime hover:text-lime">Cancel</button>
                          </>
                        ) : (
                          <>
                            <button type="button" onClick={() => startEdit(entry as ManagedUser)} className="rounded-md border border-line px-2 py-1 text-xs font-semibold transition hover:border-lime hover:text-lime">Edit Role</button>
                            <button type="button" onClick={() => requestDeleteConfirmation(entry as ManagedUser)} className="rounded-md border border-red-400/40 px-2 py-1 text-xs font-semibold text-red-300 transition hover:border-red-400/70 hover:text-red-200">Delete</button>
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
                    <th className="w-[34%] px-4 py-3">User</th>
                    {isAllTenantsView ? <th className="w-[22%] px-4 py-3">Tenant</th> : null}
                    <th className="w-[16%] px-4 py-3">Role</th>
                    <th className="w-[12%] px-4 py-3">Language</th>
                    <th className="w-[16%] px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line/70">
                  {filteredUsers.map((entry) => {
                    const isEditing = editingUserId === entry.id;

                    return (
                      <tr key={`${entry.tenantId || "tenant"}-${entry.id}`} className="align-top">
                        <td className="px-4 py-4">
                          <p className="font-semibold text-ink">{entry.name || "Unknown"}</p>
                          <p className="text-sm text-ink-muted">{entry.email || "No email"}</p>
                        </td>
                        {isAllTenantsView ? (
                          <td className="px-4 py-4">
                            <p className="text-sm font-semibold text-ink">{entry.tenantName || entry.tenantId || "Unknown tenant"}</p>
                            <p className="text-xs text-ink-muted">{entry.tenantId || "n/a"}</p>
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
                        <td className="px-4 py-4 text-sm text-ink">{entry.languageCode ? getLanguageLabel(entry.languageCode) : "n/a"}</td>
                        <td className="px-4 py-4">
                          <div className="flex justify-end gap-2">
                            {isEditing ? (
                              <>
                                <button type="button" onClick={requestSaveConfirmation} disabled={isSaving} className="rounded-md border border-line px-2 py-1 text-xs font-semibold transition hover:border-lime hover:text-lime disabled:cursor-not-allowed disabled:opacity-50">Save</button>
                                <button type="button" onClick={cancelEdit} className="rounded-md border border-line px-2 py-1 text-xs font-semibold transition hover:border-lime hover:text-lime">Cancel</button>
                              </>
                            ) : (
                              <>
                                <button type="button" onClick={() => startEdit(entry as ManagedUser)} className="rounded-md border border-line px-2 py-1 text-xs font-semibold transition hover:border-lime hover:text-lime">Edit Role</button>
                                <button type="button" onClick={() => requestDeleteConfirmation(entry as ManagedUser)} className="rounded-md border border-red-400/40 px-2 py-1 text-xs font-semibold text-red-300 transition hover:border-red-400/70 hover:text-red-200">Delete</button>
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
            ? "Delete user account?"
            : "Save role change?"
        }
        description={
          confirmState?.type === "delete"
            ? `This will deactivate ${confirmState.userName}. They will no longer be able to sign in.`
            : confirmState
              ? `Change ${confirmState.userName} from ${confirmState.currentRole} to ${confirmState.nextRole}?`
              : ""
        }
        confirmLabel={
          confirmState?.type === "delete" ? "Delete User" : "Save Changes"
        }
        cancelLabel="Cancel"
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
