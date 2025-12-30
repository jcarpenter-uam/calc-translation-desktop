import React, { useState, useEffect, useCallback } from "react";
import UserManagement from "../components/admin/user-management.jsx";
import TenantManagement from "../components/admin/tenant-management.jsx";
import ActiveSessions from "../components/admin/active-sessions.jsx";
import LogViewing from "../components/admin/log-viewing.jsx";

export default function AdminPage() {
  const [users, setUsers] = useState([]);
  const [tenants, setTenants] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [sessionsLoading, setSessionsLoading] = useState(false);
  const [sessionsError, setSessionsError] = useState(null);
  const [sessionsLastUpdated, setSessionsLastUpdated] = useState(new Date());
  const [logs, setLogs] = useState([]);
  const [logsLoading, setLogsLoading] = useState(false);
  const [logsError, setLogsError] = useState(null);

  const fetchSessions = useCallback(async (isBackground = false) => {
    if (!isBackground) setSessionsLoading(true);
    try {
      const response = await window.electron.getSessions();

      if (response.status !== "ok") {
        throw new Error(response.message || "Failed to fetch sessions");
      }

      setSessions(response.data);
      setSessionsLastUpdated(new Date());
      setSessionsError(null);
    } catch (err) {
      console.error("Session Fetch Error:", err);
      setSessionsError(err.message);
    } finally {
      if (!isBackground) setSessionsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSessions(false);

    const interval = setInterval(() => {
      fetchSessions(true);
    }, 10000);

    return () => clearInterval(interval);
  }, [fetchSessions]);

  const fetchLogs = async () => {
    try {
      const response = await window.electron.getLogs();
      if (response.status !== "ok") {
        throw new Error(response.message || "Failed to fetch logs");
      }

      setLogs(response.data.logs || []);
      setLogsError(null);
    } catch (err) {
      console.error("Log fetch failed", err);
    }
  };

  useEffect(() => {
    fetchLogs();
    const interval = setInterval(fetchLogs, 3000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const [userResponse, tenantResponse] = await Promise.all([
          window.electron.getUsers(),
          window.electron.getTenants(),
        ]);

        if (userResponse.status !== "ok") {
          throw new Error(userResponse.message || "Failed to fetch users");
        }
        if (tenantResponse.status !== "ok") {
          throw new Error(tenantResponse.message || "Failed to fetch tenants");
        }

        setUsers(userResponse.data);
        setTenants(tenantResponse.data);
        setError(null);
      } catch (err) {
        console.error("Admin Page Fetch Error:", err);
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  const handleSetUserAdminStatus = async (userId, isAdmin) => {
    try {
      const response = await window.electron.setUserAdminStatus(userId, {
        is_admin: isAdmin,
      });

      if (response.status !== "ok") {
        throw new Error(response.message || "Failed to set admin status");
      }

      const updatedUser = response.data;

      setUsers((prevUsers) =>
        prevUsers.map((user) =>
          user.id === userId ? { ...user, ...updatedUser } : user,
        ),
      );
    } catch (err) {
      console.error("Set admin status error:", err);
    }
  };

  const handleDeleteUser = async (userId) => {
    try {
      const response = await window.electron.deleteUser(userId);

      if (response.status !== "ok") {
        throw new Error(response.message || "Failed to delete user");
      }

      setUsers((prevUsers) => prevUsers.filter((user) => user.id !== userId));
    } catch (err) {
      console.error("Delete error:", err);
    }
  };

  const handleCreateTenant = async (createData) => {
    try {
      const response = await window.electron.createTenant(createData);

      if (response.status !== "ok") {
        throw new Error(response.message || "Failed to create tenant");
      }

      const newTenant = response.data;
      setTenants((prevTenants) => [...prevTenants, newTenant]);
    } catch (err) {
      console.error("Create tenant error:", err);
      // Optional: set error state or alert
    }
  };

  const handleUpdateTenant = async (tenantId, updateData) => {
    try {
      const response = await window.electron.updateTenant(tenantId, updateData);

      if (response.status !== "ok") {
        throw new Error(response.message || "Failed to update tenant");
      }

      const updatedTenant = response.data;
      setTenants((prevTenants) =>
        prevTenants.map((t) => (t.tenant_id === tenantId ? updatedTenant : t)),
      );
    } catch (err) {
      console.error("Update tenant error:", err);
    }
  };

  const handleDeleteTenant = async (tenantId) => {
    try {
      const response = await window.electron.deleteTenant(tenantId);

      if (response.status !== "ok") {
        throw new Error(response.message || "Failed to delete tenant");
      }

      setTenants((prevTenants) =>
        prevTenants.filter((t) => t.tenant_id !== tenantId),
      );
    } catch (err) {
      console.error("Delete tenant error:", err);
    }
  };

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
        <ActiveSessions
          sessions={sessions}
          loading={sessionsLoading}
          error={sessionsError}
          lastUpdated={sessionsLastUpdated}
          onRefresh={() => fetchSessions(false)}
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
