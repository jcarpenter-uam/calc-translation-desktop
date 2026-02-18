import { useEffect } from "react";

export function useCalendarAutoSync(syncCalendar) {
  useEffect(() => {
    const SYNC_KEY = "calendar_last_synced_at";
    const TTL = 12 * 60 * 60 * 1000; // 12 hours
    const now = Date.now();
    const lastSync = localStorage.getItem(SYNC_KEY);

    if (!lastSync || now - parseInt(lastSync, 10) > TTL) {
      syncCalendar();
      localStorage.setItem(SYNC_KEY, now.toString());
      console.log("Calendar auto synced");
    }
  }, [syncCalendar]);
}
