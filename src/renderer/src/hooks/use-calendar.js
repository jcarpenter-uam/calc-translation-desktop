import { useState, useEffect, useCallback } from "react";
import log from "electron-log/renderer";

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
      log.info("Calendar: Fetching events", {
        startIso,
        endIso,
      });

      const response = await window.electron.getCalendarEvents(
        startIso,
        endIso,
      );

      if (response.status === "ok" || response.data) {
        const eventData = Array.isArray(response.data) ? response.data : [];
        log.info("Calendar: Event fetch succeeded", {
          count: eventData.length,
        });
        setEvents(eventData);
      } else {
        log.warn("Calendar: Unexpected response format", response);
      }
    } catch (err) {
      log.error("Calendar: Fetch failed", err.message || err);
      setError("Failed to load calendar.");
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate]);

  const syncCalendar = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      log.info("Calendar: Starting sync");
      const response = await window.electron.syncCalendar();

      const isSuccess =
        response.status === "ok" ||
        response.status === 200 ||
        response.status === 204 ||
        !response.error;

      if (!isSuccess) {
        throw new Error(response.message || "Failed to sync calendar.");
      }

      log.info("Calendar: Sync succeeded, refreshing events");
      await fetchCalendar();
    } catch (err) {
      log.error("Calendar: Sync failed", err.message || err);
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
