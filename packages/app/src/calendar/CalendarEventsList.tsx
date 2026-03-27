import type { CalendarEvent } from "../hooks/user";

const platformLabel: Record<CalendarEvent["platform"], string> = {
  teams: "Teams",
  google_meet: "Google Meet",
  zoom: "Zoom",
  app: "App",
};

type CalendarEventsListProps = {
  events: CalendarEvent[];
};

export function CalendarEventsList({ events }: CalendarEventsListProps) {
  return (
    <div className="space-y-2">
      {events.map((event) => (
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
            Join on {platformLabel[event.platform]}
          </a>
        </article>
      ))}
    </div>
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
