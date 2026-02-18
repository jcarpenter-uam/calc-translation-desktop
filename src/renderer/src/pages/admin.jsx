import React from "react";
import UserManagement from "../components/admin/user-management.jsx";
import TenantManagement from "../components/admin/tenant-management.jsx";
import LogViewing from "../components/admin/log-viewing.jsx";
import { useAdminData } from "../hooks/use-admin-data.js";

export default function AdminPage() {
  const {
    users,
    tenants,
    logs,
    isLoading,
    error,
    logsLoading,
    logsError,
    fetchLogs,
    handleSetUserAdminStatus,
    handleDeleteUser,
    handleCreateTenant,
    handleUpdateTenant,
    handleDeleteTenant,
  } = useAdminData();

  const renderContent = () => {
    if (isLoading) {
      return (
        <div className="flex justify-center items-center h-64">
          <p className="text-zinc-500 dark:text-zinc-400">
            Loading admin data...
          </p>
        </div>
      );
    }
    if (error) {
      return (
        <div className="p-4 bg-red-50 border border-red-200 text-red-600 rounded-lg text-center">
          <p>Error: {error}</p>
        </div>
      );
    }
    return (
      <div className="space-y-12">
        <UserManagement
          users={users}
          onToggleAdmin={(userId, is_admin) =>
            handleSetUserAdminStatus(userId, is_admin)
          }
          onDeleteUser={handleDeleteUser}
        />
        <hr className="border-zinc-200 dark:border-zinc-700" />
        <TenantManagement
          tenants={tenants}
          onCreateTenant={handleCreateTenant}
          onUpdateTenant={handleUpdateTenant}
          onDeleteTenant={handleDeleteTenant}
        />
        <hr className="border-zinc-200 dark:border-zinc-700" />
        <LogViewing
          logs={logs}
          loading={logsLoading}
          error={logsError}
          onRefresh={fetchLogs}
        />
      </div>
    );
  };

  return (
    <div className="flex-grow container mx-auto p-4 sm:p-6 lg:p-8">
      {renderContent()}
    </div>
  );
}
