import { useMemo, useState } from "react";
import { ApiError } from "../hooks/api";
import {
  useCalendarEvents,
  useSyncCalendar,
  type CalendarEvent,
} from "../hooks/calendar";

const platformLabel: Record<CalendarEvent["platform"], string> = {
  teams: "Teams",
  google_meet: "Google Meet",
  zoom: "Zoom",
  app: "App",
};

/**
 * Shows upcoming provider-synced meetings and allows manual provider sync.
 */
export function CalendarSection() {
  const [syncMessage, setSyncMessage] = useState<string | null>(null);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);

  const { data, isLoading, error } = useCalendarEvents(8, true);
  const syncCalendar = useSyncCalendar(8);

  const sortedEvents = useMemo(() => {
    const raw = data?.events || [];
    return [...raw].sort((left, right) => {
      const leftTime = left.startsAt ? new Date(left.startsAt).getTime() : 0;
      const rightTime = right.startsAt ? new Date(right.startsAt).getTime() : 0;
      return leftTime - rightTime;
    });
  }, [data?.events]);

  const onSync = async () => {
    setSyncMessage(null);
    setSyncError(null);
    setIsSyncing(true);

    try {
      const result = await syncCalendar();
      setSyncMessage(
        `Calendar sync complete (${result.savedCount} saved across ${result.providers.length} provider${result.providers.length === 1 ? "" : "s"}).`,
      );
      if (result.reauthProviders.length > 0) {
        setSyncError(
          `Re-auth required for: ${result.reauthProviders.join(", ")}. Sign in again with those providers.`,
        );
      }
    } catch (err) {
      setSyncError(
        err instanceof ApiError
          ? err.message
          : "Failed to sync calendar provider.",
      );
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
          <h2 className="mt-1 text-lg font-semibold">Upcoming Meetings</h2>
          <p className="mt-1 text-sm text-ink-muted">
            We only show events with Teams, Google Meet, Zoom, or app links.
          </p>
        </div>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => {
              void onSync();
            }}
            disabled={isSyncing}
            className="rounded-lg border border-line px-3 py-2 text-xs font-semibold text-ink transition hover:border-lime hover:text-lime disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSyncing ? "Syncing..." : "Sync Calendar"}
          </button>
        </div>
      </div>

      {syncMessage ? (
        <p className="mb-3 rounded-lg border border-lime/40 bg-lime/10 px-3 py-2 text-sm text-ink">
          {syncMessage}
        </p>
      ) : null}

      {syncError ? (
        <p className="mb-3 rounded-lg border border-red-400/40 bg-red-500/10 px-3 py-2 text-sm text-ink">
          {syncError}
        </p>
      ) : null}

      {isLoading ? (
        <p className="text-sm text-ink-muted">Loading calendar events...</p>
      ) : error ? (
        <p className="text-sm text-ink-muted">
          Could not load calendar events right now.
        </p>
      ) : sortedEvents.length === 0 ? (
        <p className="text-sm text-ink-muted">
          No supported upcoming meeting links found yet.
        </p>
      ) : (
        <div className="space-y-2">
          {sortedEvents.map((event) => (
            <article
              key={event.id}
              className="rounded-xl border border-line/70 bg-panel/70 px-4 py-3"
            >
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-semibold text-ink">
                    {event.title || "Untitled event"}
                  </p>
                  <p className="text-xs text-ink-muted">
                    {formatDateTime(event.startsAt)}
                    {event.endsAt ? ` - ${formatTime(event.endsAt)}` : ""}
                  </p>
                </div>
                <span className="w-fit rounded-full border border-line px-2.5 py-1 text-xs font-semibold text-ink-muted">
                  {platformLabel[event.platform]}
                </span>
              </div>

              <a
                href={event.joinUrl}
                target="_blank"
                rel="noreferrer"
                className="mt-2 inline-block text-xs font-semibold text-lime transition hover:text-lime-hover"
              >
                Join on {event.platform}
              </a>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

function formatDateTime(value: string | null) {
  if (!value) {
    return "Time not available";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "Time not available";
  }

  return new Intl.DateTimeFormat(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

function formatTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return new Intl.DateTimeFormat(undefined, {
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}
