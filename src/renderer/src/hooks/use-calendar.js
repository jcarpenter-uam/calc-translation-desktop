import { useState, useEffect, useCallback } from "react";

export function useCalendar(startDate = null, endDate = null) {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchCalendar = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const startIso = startDate ? startDate.toISOString() : null;
      const endIso = endDate ? endDate.toISOString() : null;

      const response = await window.electron.getCalendarEvents(
        startIso,
        endIso,
      );

      if (response.status === "ok" || response.data) {
        const eventData = Array.isArray(response.data) ? response.data : [];
        setEvents(eventData);
      } else {
        console.warn("Unexpected calendar response format:", response);
      }
    } catch (err) {
      console.error("fetchCalendar error:", err);
      setError("Failed to load calendar.");
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate]);

  const syncCalendar = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await window.electron.syncCalendar();

      const isSuccess =
        response.status === "ok" ||
        response.status === 200 ||
        response.status === 204 ||
        !response.error;

      if (!isSuccess) {
        throw new Error(response.message || "Failed to sync calendar.");
      }

      console.log("Sync successful, refreshing events...");
      await fetchCalendar();
    } catch (err) {
      console.error("syncCalendar error:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [fetchCalendar]);

  useEffect(() => {
    fetchCalendar();
  }, [fetchCalendar]);

  return { events, loading, error, syncCalendar };
}
