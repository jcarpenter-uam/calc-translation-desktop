import { useCallback, useEffect, useState } from "react";

export function useAdminData() {
  const [users, setUsers] = useState([]);
  const [tenants, setTenants] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [logs, setLogs] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const [reviewsError, setReviewsError] = useState(null);

  const fetchLogs = useCallback(async () => {
    try {
      const response = await window.electron.getLogs();
      if (response.status !== "ok") {
        throw new Error(response.message || "Failed to fetch logs");
      }

      setLogs(response.data.logs || []);
    } catch (err) {
      console.error("Log fetch failed", err);
    }
  }, []);

  const fetchReviews = useCallback(async () => {
    setReviewsLoading(true);
    setReviewsError(null);
    try {
      const response = await window.electron.getReviews();
      if (response.status !== "ok") {
        throw new Error(response.message || "Failed to fetch reviews");
      }
      setReviews(response.data || []);
    } catch (err) {
      console.error("Review fetch failed", err);
      setReviewsError(err.message);
    } finally {
      setReviewsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLogs();
    const interval = setInterval(fetchLogs, 3000);
    return () => clearInterval(interval);
  }, [fetchLogs]);

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

  useEffect(() => {
    fetchReviews();
  }, [fetchReviews]);

  const handleSetUserAdminStatus = useCallback(async (userId, isAdmin) => {
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
  }, []);

  const handleDeleteUser = useCallback(async (userId) => {
    try {
      const response = await window.electron.deleteUser(userId);

      if (response.status !== "ok") {
        throw new Error(response.message || "Failed to delete user");
      }

      setUsers((prevUsers) => prevUsers.filter((user) => user.id !== userId));
    } catch (err) {
      console.error("Delete error:", err);
    }
  }, []);

  const handleCreateTenant = useCallback(async (createData) => {
    try {
      const response = await window.electron.createTenant(createData);

      if (response.status !== "ok") {
        throw new Error(response.message || "Failed to create tenant");
      }

      const newTenant = response.data;
      setTenants((prevTenants) => [...prevTenants, newTenant]);
    } catch (err) {
      console.error("Create tenant error:", err);
    }
  }, []);

  const handleUpdateTenant = useCallback(async (tenantId, updateData) => {
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
  }, []);

  const handleDeleteTenant = useCallback(async (tenantId) => {
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
  }, []);

  return {
    users,
    tenants,
    logs,
    reviews,
    isLoading,
    error,
    logsLoading: false,
    logsError: null,
    fetchLogs,
    reviewsLoading,
    reviewsError,
    fetchReviews,
    handleSetUserAdminStatus,
    handleDeleteUser,
    handleCreateTenant,
    handleUpdateTenant,
    handleDeleteTenant,
  };
}
