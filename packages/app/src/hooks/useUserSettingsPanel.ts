import { useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import { useNotifications } from "../contexts/NotificationContext";
import { ApiError } from "./api";
import {
  useAllTenantUsers,
  useDeleteTenantUser,
  useTenantUsersForTenant,
  useUpdateTenantUser,
  type UpdateUserPayload,
} from "./tenants";

export type ManagedUser = {
  id: string;
  name: string | null;
  email: string | null;
  role: string;
  languageCode: string | null;
  tenantId?: string | null;
  tenantName?: string | null;
};

export type AdminRole = "user" | "tenant_admin" | "super_admin";

export type ConfirmState =
  | {
      type: "save";
      userId: string;
      userName: string;
      currentRole: string;
      nextRole: AdminRole;
    }
  | { type: "delete"; userId: string; userName: string }
  | null;

/**
 * Encapsulates tenant user admin state, queries, and mutations.
 */
export function useUserSettingsPanel({
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

  const [search, setSearch] = useState("");
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
    (isAllTenantsView ? allUsersQuery.data?.users : tenantUsersQuery.data?.users) || [];
  const isUsersLoading = isAllTenantsView ? allUsersQuery.isLoading : tenantUsersQuery.isLoading;
  const tenantLabel =
    tenantOptions.find((entry) => entry.id === effectiveTenantId)?.name ||
    effectiveTenantId ||
    "active tenant";

  const getMutationTenantId = (targetUserId: string) => {
    if (!isAllTenantsView) {
      return effectiveTenantId;
    }

    return filteredUsers.find((entry) => entry.id === targetUserId)?.tenantId || null;
  };

  const startEdit = (entry: ManagedUser) => {
    setEditingUserId(entry.id);
    setEditRole((entry.role as AdminRole) || "user");
  };

  const cancelEdit = () => {
    setEditingUserId(null);
  };

  const saveUserRole = async (targetUserId: string, role: AdminRole) => {
    const targetTenantId = getMutationTenantId(targetUserId);
    if (!targetTenantId) {
      return;
    }

    setIsSaving(true);
    try {
      const payload: UpdateUserPayload = { role };
      await updateTenantUser(targetUserId, payload, targetTenantId);
      setEditingUserId(null);
      setConfirmState(null);
      notify({
        title: "User Updated",
        message: "User role changes were saved.",
        variant: "success",
      });
    } catch (err) {
      notify({
        title: "Update Failed",
        message: err instanceof ApiError ? err.message : "Failed to update user.",
        variant: "error",
      });
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
    try {
      await deleteTenantUser(targetUserId, targetTenantId);
      if (editingUserId === targetUserId) {
        setEditingUserId(null);
      }
      setConfirmState(null);
      notify({
        title: "User Deleted",
        message: "The user was removed successfully.",
        variant: "success",
      });
    } catch (err) {
      notify({
        title: "Delete Failed",
        message: err instanceof ApiError ? err.message : "Failed to delete user.",
        variant: "error",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const requestSaveConfirmation = () => {
    if (!editingUserId) {
      return;
    }

    const entry = filteredUsers.find((candidate) => candidate.id === editingUserId);
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

  return {
    isAdmin,
    isSuperAdmin,
    isAllTenantsView,
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
  };
}
