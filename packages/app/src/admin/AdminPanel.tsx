import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../auth/AuthContext";
import { ApiError } from "../hooks/api";
import {
  useDeleteTenantUser,
  useTenants,
  useTenantUsersForTenant,
  useUpdateTenantUser,
  type UpdateUserPayload,
} from "../hooks/users";

type ManagedUser = {
  id: string;
  name: string | null;
  email: string | null;
  role: string;
  languageCode: string | null;
};

type AdminRole = "user" | "tenant_admin" | "super_admin";

/**
 * Admin settings panel for tenant-scoped user management.
 */
export function AdminPanel() {
  const { user, tenantId } = useAuth();
  const isSuperAdmin = user?.role === "super_admin";
  const isTenantAdmin = user?.role === "tenant_admin";
  const isAdmin = isSuperAdmin || isTenantAdmin;

  const { data: tenantData, isLoading: isTenantLoading } = useTenants(isAdmin);
  const [selectedTenantId, setSelectedTenantId] = useState<string>(
    tenantId || "",
  );
  const [search, setSearch] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editLanguageCode, setEditLanguageCode] = useState("en");
  const [editRole, setEditRole] = useState<AdminRole>("user");

  useEffect(() => {
    if (!isSuperAdmin) {
      setSelectedTenantId(tenantId || "");
      return;
    }

    const availableTenantIds =
      tenantData?.tenants.map((tenant) => tenant.id) || [];
    if (availableTenantIds.length === 0) {
      return;
    }

    if (selectedTenantId && availableTenantIds.includes(selectedTenantId)) {
      return;
    }

    const preferredTenantId =
      (tenantId && availableTenantIds.includes(tenantId) && tenantId) ||
      availableTenantIds[0] ||
      "";

    setSelectedTenantId(preferredTenantId);
  }, [isSuperAdmin, selectedTenantId, tenantData?.tenants, tenantId]);

  const effectiveTenantId = isSuperAdmin
    ? selectedTenantId || tenantId
    : tenantId;
  const { data: usersData, isLoading: isUsersLoading } =
    useTenantUsersForTenant(
      effectiveTenantId || null,
      isAdmin && Boolean(effectiveTenantId),
    );

  const updateTenantUser = useUpdateTenantUser();
  const deleteTenantUser = useDeleteTenantUser();

  const filteredUsers = useMemo(() => {
    const allUsers = usersData?.users || [];
    const query = search.trim().toLowerCase();
    if (!query) {
      return allUsers;
    }

    return allUsers.filter((entry) => {
      const haystack = [entry.name, entry.email, entry.role, entry.languageCode]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(query);
    });
  }, [search, usersData?.users]);

  if (!isAdmin) {
    return null;
  }

  const startEdit = (entry: ManagedUser) => {
    setMessage(null);
    setError(null);
    setEditingUserId(entry.id);
    setEditName(entry.name || "");
    setEditEmail(entry.email || "");
    setEditLanguageCode(entry.languageCode || "en");
    setEditRole((entry.role as AdminRole) || "user");
  };

  const cancelEdit = () => {
    setEditingUserId(null);
    setError(null);
  };

  const handleSave = async () => {
    if (!editingUserId || !effectiveTenantId) {
      return;
    }

    setIsSaving(true);
    setMessage(null);
    setError(null);

    try {
      const payload: UpdateUserPayload = {
        name: editName.trim() || null,
        email: editEmail.trim() || null,
        languageCode: editLanguageCode.trim() || null,
        role: editRole,
        tenantId: effectiveTenantId,
      };

      await updateTenantUser(editingUserId, payload, effectiveTenantId);
      setEditingUserId(null);
      setMessage("User updated.");
    } catch (err) {
      const nextError =
        err instanceof ApiError ? err.message : "Failed to update user.";
      setError(nextError);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (targetUserId: string) => {
    if (!effectiveTenantId) {
      return;
    }

    const browser = globalThis as typeof globalThis & {
      confirm?: (message: string) => boolean;
    };

    const confirmed = browser.confirm
      ? browser.confirm("Delete this user account?")
      : true;
    if (!confirmed) {
      return;
    }

    setMessage(null);
    setError(null);

    try {
      await deleteTenantUser(targetUserId, effectiveTenantId);
      if (editingUserId === targetUserId) {
        setEditingUserId(null);
      }
      setMessage("User deleted.");
    } catch (err) {
      const nextError =
        err instanceof ApiError ? err.message : "Failed to delete user.";
      setError(nextError);
    }
  };

  const roleOptions: AdminRole[] = isSuperAdmin
    ? ["user", "tenant_admin", "super_admin"]
    : ["user", "tenant_admin"];

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-line bg-canvas p-3">
        <p className="mb-2 text-xs font-semibold uppercase tracking-[0.12em] text-ink-muted">
          Admin
        </p>

        {isSuperAdmin ? (
          <label className="mb-3 block space-y-1">
            <span className="text-xs font-semibold uppercase tracking-[0.12em] text-ink-muted">
              Tenant
            </span>
            <select
              value={selectedTenantId}
              onChange={(event: any) =>
                setSelectedTenantId(String(event.target.value))
              }
              className="w-full rounded-lg border border-line bg-panel px-3 py-2 text-sm text-ink focus:border-lime focus:outline-none focus:ring-4 focus:ring-lime/20"
              disabled={isTenantLoading}
            >
              {(tenantData?.tenants || []).map((tenant) => (
                <option key={tenant.id} value={tenant.id}>
                  {tenant.name || tenant.id}
                </option>
              ))}
            </select>
          </label>
        ) : null}

        <label className="block space-y-1">
          <span className="text-xs font-semibold uppercase tracking-[0.12em] text-ink-muted">
            Search
          </span>
          <input
            value={search}
            onChange={(event: any) => setSearch(String(event.target.value))}
            placeholder="Search users"
            className="w-full rounded-lg border border-line bg-panel px-3 py-2 text-sm text-ink placeholder:text-ink-muted focus:border-lime focus:outline-none focus:ring-4 focus:ring-lime/20"
          />
        </label>
      </div>

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

      <div className="max-h-80 overflow-auto rounded-xl border border-line bg-canvas">
        {isUsersLoading ? (
          <p className="p-4 text-sm text-ink-muted">Loading users...</p>
        ) : filteredUsers.length === 0 ? (
          <p className="p-4 text-sm text-ink-muted">No users found.</p>
        ) : (
          <table className="w-full text-left text-sm text-ink">
            <thead className="sticky top-0 bg-panel">
              <tr>
                <th className="px-3 py-2 font-semibold">User</th>
                <th className="px-3 py-2 font-semibold">Role</th>
                <th className="px-3 py-2 font-semibold">Language</th>
                <th className="px-3 py-2 font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map((entry) => {
                const isEditing = editingUserId === entry.id;

                return (
                  <tr key={entry.id} className="border-t border-line/70">
                    <td className="px-3 py-2 align-top">
                      {isEditing ? (
                        <div className="space-y-2">
                          <input
                            value={editName}
                            onChange={(event: any) =>
                              setEditName(String(event.target.value))
                            }
                            className="w-full rounded-lg border border-line bg-panel px-2 py-1.5 text-sm text-ink focus:border-lime focus:outline-none focus:ring-4 focus:ring-lime/20"
                            placeholder="Name"
                          />
                          <input
                            value={editEmail}
                            onChange={(event: any) =>
                              setEditEmail(String(event.target.value))
                            }
                            className="w-full rounded-lg border border-line bg-panel px-2 py-1.5 text-sm text-ink focus:border-lime focus:outline-none focus:ring-4 focus:ring-lime/20"
                            placeholder="Email"
                          />
                        </div>
                      ) : (
                        <>
                          <p className="font-semibold">
                            {entry.name || "Unknown"}
                          </p>
                          <p className="text-ink-muted">
                            {entry.email || "No email"}
                          </p>
                        </>
                      )}
                    </td>

                    <td className="px-3 py-2 align-top">
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
                        <span>{entry.role}</span>
                      )}
                    </td>

                    <td className="px-3 py-2 align-top">
                      {isEditing ? (
                        <input
                          value={editLanguageCode}
                          onChange={(event: any) =>
                            setEditLanguageCode(String(event.target.value))
                          }
                          className="w-full rounded-lg border border-line bg-panel px-2 py-1.5 text-sm text-ink focus:border-lime focus:outline-none focus:ring-4 focus:ring-lime/20"
                          placeholder="en"
                        />
                      ) : (
                        <span>{entry.languageCode || "n/a"}</span>
                      )}
                    </td>

                    <td className="px-3 py-2 align-top">
                      <div className="flex gap-2">
                        {isEditing ? (
                          <>
                            <button
                              type="button"
                              onClick={() => {
                                void handleSave();
                              }}
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
                              Edit
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                void handleDelete(entry.id);
                              }}
                              className="rounded-md border border-red-400/40 px-2 py-1 text-xs font-semibold text-red-300 transition hover:border-red-400/70 hover:text-red-200"
                            >
                              Delete
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
