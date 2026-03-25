import { useState } from "react";
import { useAuth } from "../auth/AuthContext";
import { ConfirmDialog } from "../general/ConfirmDialog";
import { ApiError } from "../hooks/api";
import {
  useAllTenantUsers,
  useDeleteTenantUser,
  useTenantUsersForTenant,
  useUpdateTenantUser,
  type UpdateUserPayload,
} from "../hooks/users";
import { getLanguageLabel } from "../languages/LanguageList";

type ManagedUser = {
  id: string;
  name: string | null;
  email: string | null;
  role: string;
  languageCode: string | null;
  tenantId?: string | null;
  tenantName?: string | null;
};

type AdminRole = "user" | "tenant_admin" | "super_admin";

type ConfirmState =
  | {
      type: "save";
      userId: string;
      userName: string;
      currentRole: string;
      nextRole: AdminRole;
    }
  | { type: "delete"; userId: string; userName: string }
  | null;

type UserSettingsPanelProps = {
  selectedTenantId: string | null;
  isAllTenantsView: boolean;
  tenantOptions: Array<{ id: string; name: string | null }>;
};

export function UserSettingsPanel({
  selectedTenantId,
  isAllTenantsView,
  tenantOptions,
}: UserSettingsPanelProps) {
  const { user, tenantId } = useAuth();
  const isSuperAdmin = user?.role === "super_admin";
  const isTenantAdmin = user?.role === "tenant_admin";
  const isAdmin = isSuperAdmin || isTenantAdmin;
  const [search, setSearch] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [editRole, setEditRole] = useState<AdminRole>("user");
  const [confirmState, setConfirmState] = useState<ConfirmState>(null);

  const effectiveTenantId = selectedTenantId || tenantId;
  const tenantUsersQuery = useTenantUsersForTenant(
    effectiveTenantId || null,
    isAdmin && !isAllTenantsView && Boolean(effectiveTenantId),
    { q: search },
  );
  const allUsersQuery = useAllTenantUsers(isAdmin && isAllTenantsView, {
    q: search,
  });
  const updateTenantUser = useUpdateTenantUser();
  const deleteTenantUser = useDeleteTenantUser();
  const filteredUsers =
    (isAllTenantsView
      ? allUsersQuery.data?.users
      : tenantUsersQuery.data?.users) || [];
  const isUsersLoading = isAllTenantsView
    ? allUsersQuery.isLoading
    : tenantUsersQuery.isLoading;
  const tenantLabel =
    tenantOptions.find((entry) => entry.id === effectiveTenantId)?.name ||
    effectiveTenantId ||
    "active tenant";

  if (!isAdmin) {
    return null;
  }

  const getMutationTenantId = (targetUserId: string) => {
    if (!isAllTenantsView) {
      return effectiveTenantId;
    }

    return (
      filteredUsers.find((entry) => entry.id === targetUserId)?.tenantId || null
    );
  };

  const startEdit = (entry: ManagedUser) => {
    setMessage(null);
    setError(null);
    setEditingUserId(entry.id);
    setEditRole((entry.role as AdminRole) || "user");
  };

  const cancelEdit = () => {
    setEditingUserId(null);
    setError(null);
  };

  const saveUserRole = async (targetUserId: string, role: AdminRole) => {
    const targetTenantId = getMutationTenantId(targetUserId);
    if (!targetTenantId) {
      return;
    }

    setIsSaving(true);
    setMessage(null);
    setError(null);

    try {
      const payload: UpdateUserPayload = { role };
      await updateTenantUser(targetUserId, payload, targetTenantId);
      setEditingUserId(null);
      setConfirmState(null);
      setMessage("User updated.");
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Failed to update user.",
      );
    } finally {
      setIsSaving(false);
    }
  };

  const deleteUser = async (targetUserId: string) => {
    const targetTenantId = getMutationTenantId(targetUserId);
    if (!targetTenantId) {
      return;
    }

    setIsDeleting(true);
    setMessage(null);
    setError(null);

    try {
      await deleteTenantUser(targetUserId, targetTenantId);
      if (editingUserId === targetUserId) {
        setEditingUserId(null);
      }
      setConfirmState(null);
      setMessage("User deleted.");
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Failed to delete user.",
      );
    } finally {
      setIsDeleting(false);
    }
  };

  const requestSaveConfirmation = () => {
    if (!editingUserId) {
      return;
    }

    const entry = filteredUsers.find(
      (candidate) => candidate.id === editingUserId,
    );
    if (!entry) {
      return;
    }

    setConfirmState({
      type: "save",
      userId: entry.id,
      userName: entry.name || entry.email || entry.id,
      currentRole: entry.role,
      nextRole: editRole,
    });
  };

  const requestDeleteConfirmation = (entry: ManagedUser) => {
    setConfirmState({
      type: "delete",
      userId: entry.id,
      userName: entry.name || entry.email || entry.id,
    });
  };

  const roleOptions: AdminRole[] = isSuperAdmin
    ? ["user", "tenant_admin", "super_admin"]
    : ["user", "tenant_admin"];

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

      {message ? (
        <p className="rounded-lg border border-lime/40 bg-lime/10 px-3 py-2 text-sm text-ink">
          {message}
        </p>
      ) : null}
      {error ? (
        <p className="rounded-lg border border-red-400/40 bg-red-500/10 px-3 py-2 text-sm text-ink">
          {error}
        </p>
      ) : null}

      <div className="overflow-hidden rounded-xl border border-line bg-panel/40">
        <div
          className={`hidden gap-3 border-b border-line/70 bg-panel px-4 py-3 text-xs font-semibold uppercase tracking-[0.12em] text-ink-muted md:grid ${isAllTenantsView ? "grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_minmax(0,0.9fr)_minmax(0,0.9fr)_auto]" : "grid-cols-[minmax(0,1.6fr)_minmax(0,0.9fr)_minmax(0,0.9fr)_auto]"}`}
        >
          <span>User</span>
          {isAllTenantsView ? <span>Tenant</span> : null}
          <span>Role</span>
          <span>Language</span>
          <span>Actions</span>
        </div>

        <div className="max-h-80 overflow-auto">
          {isUsersLoading ? (
            <p className="p-4 text-sm text-ink-muted">Loading users...</p>
          ) : filteredUsers.length === 0 ? (
            <p className="p-4 text-sm text-ink-muted">No users found.</p>
          ) : (
            <div>
              {filteredUsers.map((entry) => {
                const isEditing = editingUserId === entry.id;

                return (
                  <div
                    key={`${entry.tenantId || "tenant"}-${entry.id}`}
                    className={`grid grid-cols-1 gap-3 border-t border-line/70 px-4 py-4 md:items-start ${isAllTenantsView ? "md:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_minmax(0,0.9fr)_minmax(0,0.9fr)_auto]" : "md:grid-cols-[minmax(0,1.6fr)_minmax(0,0.9fr)_minmax(0,0.9fr)_auto]"}`}
                  >
                    <div>
                      <p className="font-semibold text-ink">
                        {entry.name || "Unknown"}
                      </p>
                      <p className="text-sm text-ink-muted">
                        {entry.email || "No email"}
                      </p>
                    </div>

                    {isAllTenantsView ? (
                      <div>
                        <p className="text-sm font-semibold text-ink">
                          {entry.tenantName ||
                            entry.tenantId ||
                            "Unknown tenant"}
                        </p>
                        <p className="text-xs text-ink-muted">
                          {entry.tenantId || "n/a"}
                        </p>
                      </div>
                    ) : null}

                    <div>
                      {isEditing ? (
                        <select
                          value={editRole}
                          onChange={(event: any) =>
                            setEditRole(String(event.target.value) as AdminRole)
                          }
                          className="w-full rounded-lg border border-line bg-panel px-2 py-1.5 text-sm text-ink focus:border-lime focus:outline-none focus:ring-4 focus:ring-lime/20"
                        >
                          {roleOptions.map((role) => (
                            <option key={role} value={role}>
                              {role}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <span className="inline-flex rounded-full border border-line/70 bg-canvas px-2.5 py-1 text-xs font-semibold text-ink">
                          {entry.role}
                        </span>
                      )}
                    </div>

                    <div>
                      <span className="text-sm text-ink">
                        {entry.languageCode
                          ? getLanguageLabel(entry.languageCode)
                          : "n/a"}
                      </span>
                    </div>

                    <div className="flex gap-2 md:justify-end">
                      {isEditing ? (
                        <>
                          <button
                            type="button"
                            onClick={requestSaveConfirmation}
                            disabled={isSaving}
                            className="rounded-md border border-line px-2 py-1 text-xs font-semibold transition hover:border-lime hover:text-lime disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            Save
                          </button>
                          <button
                            type="button"
                            onClick={cancelEdit}
                            className="rounded-md border border-line px-2 py-1 text-xs font-semibold transition hover:border-lime hover:text-lime"
                          >
                            Cancel
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            type="button"
                            onClick={() => startEdit(entry as ManagedUser)}
                            className="rounded-md border border-line px-2 py-1 text-xs font-semibold transition hover:border-lime hover:text-lime"
                          >
                            Edit Role
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              requestDeleteConfirmation(entry as ManagedUser)
                            }
                            className="rounded-md border border-red-400/40 px-2 py-1 text-xs font-semibold text-red-300 transition hover:border-red-400/70 hover:text-red-200"
                          >
                            Delete
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
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
