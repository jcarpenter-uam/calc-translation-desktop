import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../auth/AuthContext";
import { CalendarEventsList } from "../calendar/CalendarEventsList";
import { useCalendarEvents } from "../hooks/calendar";
import { ApiError } from "../hooks/api";
import {
  useJoinMeeting,
  useMeetingInvitees,
  useQuickCreateMeeting,
} from "../hooks/meeting";
import { useAppRoute } from "../routing/RouteContext";

type QuickFlowState = "draft" | "creating" | "error";

export function Home() {
  const { user } = useAuth();
  const { navigateTo, navigateToMeeting } = useAppRoute();

  const [quickTitle, setQuickTitle] = useState("");
  const [inviteSearch, setInviteSearch] = useState("");
  const [selectedInviteeIds, setSelectedInviteeIds] = useState<string[]>([]);
  const [quickFlowState, setQuickFlowState] = useState<QuickFlowState>("draft");
  const [quickMeetingError, setQuickMeetingError] = useState<string | null>(null);
  const [inviteeDirectory, setInviteeDirectory] = useState<
    Record<string, { id: string; name: string | null; email: string | null }>
  >({});

  const now = useMemo(() => new Date(), []);
  const { data, isLoading, error } = useCalendarEvents({
    limit: 40,
    from: now.toISOString(),
  });
  const { data: inviteesData, isLoading: isInviteesLoading } = useMeetingInvitees(
    inviteSearch,
    true,
  );

  const quickCreateMeeting = useQuickCreateMeeting();
  const joinMeeting = useJoinMeeting();

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

  const invitees = inviteesData?.invitees || [];

  useEffect(() => {
    if (invitees.length === 0) {
      return;
    }

    setInviteeDirectory((current) => {
      const next = { ...current };
      for (const invitee of invitees) {
        next[invitee.id] = {
          id: invitee.id,
          name: invitee.name,
          email: invitee.email,
        };
      }

      return next;
    });
  }, [invitees]);

  const selectedInvitees = useMemo(() => {
    return selectedInviteeIds.map((id) => {
      const known = inviteeDirectory[id];
      if (known) {
        return known;
      }

      return { id, name: null, email: null };
    });
  }, [inviteeDirectory, selectedInviteeIds]);

  const quickFlowLabel = useMemo(() => {
    if (quickFlowState === "creating") {
      return "Creating";
    }

    if (quickFlowState === "error") {
      return "Needs Attention";
    }

    return "Draft";
  }, [quickFlowState]);

  const isCreatingQuickMeeting = quickFlowState === "creating";

  const toggleInvitee = (inviteeId: string) => {
    setSelectedInviteeIds((currentIds) => {
      if (currentIds.includes(inviteeId)) {
        return currentIds.filter((id) => id !== inviteeId);
      }

      return [...currentIds, inviteeId];
    });
  };

  const handleQuickCreate = async () => {
    const title = quickTitle.trim();
    if (!title) {
      setQuickMeetingError("Meeting title is required.");
      setQuickFlowState("error");
      return;
    }

    setQuickMeetingError(null);
    setQuickFlowState("creating");

    try {
      const createdMeeting = await quickCreateMeeting({
        title,
        attendeeIds: selectedInviteeIds,
      });

      const joinedMeeting = await joinMeeting(createdMeeting.readableId);

      setQuickTitle("");
      setInviteSearch("");
      setSelectedInviteeIds([]);

      navigateToMeeting({
        meetingId: joinedMeeting.meetingId,
        readableId: joinedMeeting.readableId,
        ticket: joinedMeeting.token,
      });
    } catch (err) {
      const nextError =
        err instanceof ApiError ? err.message : "Failed to start quick meeting.";
      setQuickMeetingError(nextError);
      setQuickFlowState("error");
    }
  };

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

          <div className="mt-6 rounded-2xl border border-line/70 bg-canvas p-5">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-ink-muted">
                  Quick Meeting
                </p>
                <h2 className="mt-1 text-lg font-semibold">Start in one click</h2>
                <p className="mt-1 text-xs text-ink-muted">
                  Progress: <span className="font-semibold text-ink">{quickFlowLabel}</span>
                </p>
              </div>
            </div>

            <div className="space-y-3">
              <label className="block space-y-1">
                <span className="text-xs font-semibold uppercase tracking-[0.12em] text-ink-muted">
                  Title
                </span>
                <input
                  value={quickTitle}
                  onChange={(event: any) => setQuickTitle(String(event.target.value))}
                  placeholder="Daily standup"
                  className="w-full rounded-lg border border-line bg-panel px-3 py-2 text-sm text-ink placeholder:text-ink-muted focus:border-lime focus:outline-none focus:ring-4 focus:ring-lime/20"
                />
              </label>

              <label className="block space-y-1">
                <span className="text-xs font-semibold uppercase tracking-[0.12em] text-ink-muted">
                  Invite users
                </span>
                <input
                  value={inviteSearch}
                  onChange={(event: any) => setInviteSearch(String(event.target.value))}
                  placeholder="Search by name or email"
                  className="w-full rounded-lg border border-line bg-panel px-3 py-2 text-sm text-ink placeholder:text-ink-muted focus:border-lime focus:outline-none focus:ring-4 focus:ring-lime/20"
                />
              </label>

              <div className="max-h-48 overflow-auto rounded-lg border border-line/70 bg-panel/70 p-2">
                {isInviteesLoading ? (
                  <p className="px-2 py-1 text-xs text-ink-muted">Loading users...</p>
                ) : invitees.length === 0 && inviteSearch.trim().length > 0 ? (
                  <p className="px-2 py-1 text-xs text-ink-muted">
                    No users match your search.
                  </p>
                ) : invitees.length === 0 ? (
                  <p className="px-2 py-1 text-xs text-ink-muted">
                    No invite candidates available.
                  </p>
                ) : (
                  <div className="space-y-1">
                    {invitees.map((invitee) => {
                      const selected = selectedInviteeIds.includes(invitee.id);
                      return (
                        <button
                          key={invitee.id}
                          type="button"
                          onClick={() => toggleInvitee(invitee.id)}
                          className={`flex w-full items-center justify-between rounded-lg border px-2 py-1.5 text-left text-xs transition ${
                            selected
                              ? "border-lime/50 bg-lime/10 text-lime"
                              : "border-line text-ink hover:border-lime hover:text-lime"
                          }`}
                        >
                          <span>
                            {invitee.name || invitee.email || invitee.id}
                          </span>
                          <span className="text-[10px] uppercase tracking-[0.1em] text-ink-muted">
                            {selected ? "Invited" : "Add"}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              <p className="text-xs text-ink-muted">
                Results: {invitees.length} | Selected: {selectedInviteeIds.length}
              </p>

              {selectedInvitees.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {selectedInvitees.map((invitee) => (
                    <button
                      key={invitee.id}
                      type="button"
                      onClick={() => toggleInvitee(invitee.id)}
                      className="rounded-full border border-line px-2 py-1 text-xs text-ink transition hover:border-lime hover:text-lime"
                    >
                      {invitee.name || invitee.email || invitee.id} x
                    </button>
                  ))}
                </div>
              ) : null}

              {quickMeetingError ? (
                <p className="rounded-lg border border-red-400/40 bg-red-500/10 px-3 py-2 text-sm text-ink">
                  {quickMeetingError}
                </p>
              ) : null}

              <button
                type="button"
                onClick={() => {
                  void handleQuickCreate();
                }}
                disabled={isCreatingQuickMeeting}
                className="rounded-lg border border-line px-3 py-2 text-xs font-semibold text-ink transition hover:border-lime hover:text-lime disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isCreatingQuickMeeting ? "Creating and opening room..." : "Start Quick Meeting"}
              </button>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
