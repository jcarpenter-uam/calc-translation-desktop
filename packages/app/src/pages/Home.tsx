import { useMemo } from "react";
import { useAuth } from "../auth/AuthContext";
import { CalendarEventsList } from "../calendar/CalendarEventsList";
import { useCalendarEvents } from "../hooks/calendar";
import { useAppRoute } from "../routing/RouteContext";

export function Home() {
  const { user } = useAuth();
  const { navigateTo } = useAppRoute();

  const now = useMemo(() => new Date(), []);
  const { data, isLoading, error } = useCalendarEvents({
    limit: 40,
    from: now.toISOString(),
  });

  const todayUpcomingEvents = useMemo(() => {
    const raw = data?.events || [];

    const filtered = raw.filter((event) => {
      if (!event.startsAt) {
        return false;
      }

      const startsAt = new Date(event.startsAt);
      if (Number.isNaN(startsAt.getTime()) || startsAt.getTime() < now.getTime()) {
        return false;
      }

      return (
        startsAt.getFullYear() === now.getFullYear() &&
        startsAt.getMonth() === now.getMonth() &&
        startsAt.getDate() === now.getDate()
      );
    });

    return filtered.sort((left, right) => {
      const leftTime = left.startsAt ? new Date(left.startsAt).getTime() : 0;
      const rightTime = right.startsAt ? new Date(right.startsAt).getTime() : 0;
      return leftTime - rightTime;
    });
  }, [data?.events, now]);

  return (
    <main className="min-h-[calc(100dvh-3rem)] px-6 py-8 text-ink">
      <section className="relative mx-auto w-full max-w-4xl overflow-hidden rounded-3xl border border-line/80 bg-panel/90 shadow-panel backdrop-blur-sm">
        <div className="mx-auto w-full rounded-2xl p-6 md:p-7">
          <h1 className="mb-1 text-2xl font-semibold">
            Welcome back, {user?.name || user?.email || "Unknown"}!
          </h1>
          <p className="text-sm text-ink-muted">
            Here is your minimal agenda for the rest of today.
          </p>

          <div className="mt-6 rounded-2xl border border-line/70 bg-canvas p-5">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-ink-muted">
                  Today
                </p>
                <h2 className="mt-1 text-lg font-semibold">Upcoming Events</h2>
              </div>

              <button
                type="button"
                onClick={() => navigateTo("calendar")}
                className="rounded-lg border border-line px-3 py-2 text-xs font-semibold text-ink transition hover:border-lime hover:text-lime"
              >
                View Full Calendar
              </button>
            </div>

            {isLoading ? (
              <p className="text-sm text-ink-muted">Loading events for today...</p>
            ) : error ? (
              <p className="text-sm text-ink-muted">
                Could not load your events right now.
              </p>
            ) : todayUpcomingEvents.length === 0 ? (
              <p className="text-sm text-ink-muted">
                No more supported meeting events today.
              </p>
            ) : (
              <CalendarEventsList events={todayUpcomingEvents} />
            )}
          </div>
        </div>
      </section>
    </main>
  );
}
