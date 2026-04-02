import { useMemo, useState } from "react";
import { useNotifications } from "../contexts/NotificationContext";
import { ApiError } from "../hooks/api";
import { useCalendarEvents, useSyncCalendar } from "../hooks/user";
import { CalendarEventsList } from "./CalendarEventsList";

/**
 * Shows upcoming provider-synced meetings and allows manual provider sync.
 */
export function CalendarSection() {
  const [isSyncing, setIsSyncing] = useState(false);
  const [fromDate, setFromDate] = useState(() => formatDateInput(new Date()));
  const [toDate, setToDate] = useState(() => {
    const nextWeek = new Date();
    nextWeek.setDate(nextWeek.getDate() + 7);
    return formatDateInput(nextWeek);
  });
  const { notify } = useNotifications();

  const eventsOptions = useMemo(
    () => ({
      limit: 100,
      from: toRangeBoundary(fromDate, "start"),
      to: toRangeBoundary(toDate, "end"),
    }),
    [fromDate, toDate],
  );
  const { data, isLoading, error } = useCalendarEvents(eventsOptions);
  const syncCalendar = useSyncCalendar(eventsOptions);

  const sortedEvents = useMemo(() => {
    const raw = data?.events || [];
    return [...raw].sort((left, right) => {
      const leftTime = left.startsAt ? new Date(left.startsAt).getTime() : 0;
      const rightTime = right.startsAt ? new Date(right.startsAt).getTime() : 0;
      return leftTime - rightTime;
    });
  }, [data?.events]);

  const onSync = async () => {
    setIsSyncing(true);

    try {
      const result = await syncCalendar();
      notify({
        title: "Calendar Synced",
        message: `Calendar sync complete (${result.savedCount} saved across ${result.providers.length} provider${result.providers.length === 1 ? "" : "s"}).`,
        variant: "success",
      });
      if (result.reauthProviders.length > 0) {
        // Surface partial-success reauth needs separately so the main sync result is still visible.
        notify({
          title: "Re-auth Required",
          message: `Re-auth required for: ${result.reauthProviders.join(", ")}. Sign in again with those providers.`,
          variant: "warning",
          durationMs: 5200,
        });
      }
    } catch (err) {
      notify({
        title: "Sync Failed",
        message:
          err instanceof ApiError
            ? err.message
            : "Failed to sync calendar provider.",
        variant: "error",
      });
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <section className="mt-8 rounded-2xl border border-line/70 bg-canvas p-5">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-ink-muted">
            Calendar
          </p>
          <h2 className="mt-1 text-lg font-semibold">Synced Meetings</h2>
          <p className="mt-1 text-sm text-ink-muted">
            We show synced events with Teams, Google Meet, Zoom, or app links, including cancelled meetings.
          </p>
        </div>

        <div className="flex flex-col gap-2 sm:items-end">
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <label className="flex flex-col gap-1 text-xs font-semibold uppercase tracking-[0.12em] text-ink-muted">
              From
              <input
                type="date"
                value={fromDate}
                onChange={(event) => setFromDate(event.target.value)}
                className="rounded-lg border border-line bg-panel px-3 py-2 text-sm font-medium normal-case tracking-normal text-ink outline-none transition focus:border-lime"
              />
            </label>
            <label className="flex flex-col gap-1 text-xs font-semibold uppercase tracking-[0.12em] text-ink-muted">
              To
              <input
                type="date"
                value={toDate}
                onChange={(event) => setToDate(event.target.value)}
                className="rounded-lg border border-line bg-panel px-3 py-2 text-sm font-medium normal-case tracking-normal text-ink outline-none transition focus:border-lime"
              />
            </label>
          </div>
          <button
            type="button"
            onClick={() => {
              void onSync();
            }}
            disabled={isSyncing || !fromDate || !toDate}
            className="rounded-lg border border-line px-3 py-2 text-xs font-semibold text-ink transition hover:border-lime hover:text-lime disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSyncing ? "Syncing..." : "Sync Calendar"}
          </button>
        </div>
      </div>

      {isLoading ? (
        <p className="text-sm text-ink-muted">Loading calendar events...</p>
      ) : error ? (
        <p className="text-sm text-ink-muted">
          Could not load calendar events right now.
        </p>
      ) : sortedEvents.length === 0 ? (
        <p className="text-sm text-ink-muted">
          No supported synced meeting links found yet.
        </p>
      ) : (
        <CalendarEventsList events={sortedEvents} />
      )}
    </section>
  );
}

function formatDateInput(value: Date) {
  return value.toISOString().slice(0, 10);
}

function toRangeBoundary(value: string, boundary: "start" | "end") {
  if (!value) {
    return undefined;
  }

  return boundary === "start"
    ? `${value}T00:00:00.000Z`
    : `${value}T23:59:59.999Z`;
}
