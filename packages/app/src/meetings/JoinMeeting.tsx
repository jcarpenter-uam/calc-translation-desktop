import { useState, type FormEvent } from "react";

type JoinMeetingFormData = {
  meetingId: string;
  password: string;
  joinUrl: string;
};

type JoinMeetingProps = {
  onSubmit: (data: JoinMeetingFormData) => Promise<void> | void;
  isSubmitting?: boolean;
  error?: string | null;
};

/**
 * Join form that accepts either a pasted link or manually entered meeting details.
 */
export function JoinMeeting({
  onSubmit,
  isSubmitting = false,
  error = null,
}: JoinMeetingProps) {
  const [showManualFields, setShowManualFields] = useState(false);
  const [meetingId, setMeetingId] = useState("");
  const [password, setPassword] = useState("");
  const [joinUrl, setJoinUrl] = useState("");

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    void onSubmit({ meetingId, password, joinUrl });
  };

  const handleJoinUrlChange = (e: any) => {
    setJoinUrl(e.target.value);
  };

  const handleMeetingIdChange = (e: any) => {
    setMeetingId(e.target.value);
  };

  const handlePasswordChange = (e: any) => {
    setPassword(e.target.value);
  };

  const showManual = () => {
    setShowManualFields((current) => !current);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-ink-muted">
          Quick Join
        </p>
        <h2 className="mt-2 text-2xl font-semibold text-ink">Join a meeting</h2>
        <p className="mt-2 max-w-2xl text-sm text-ink-muted">
          Paste a join link or enter the meeting details manually.
        </p>
      </div>

      <div className="rounded-2xl border border-line/70 bg-canvas p-4 sm:p-5">
        <label htmlFor="joinUrl" className="block space-y-2">
          <span className="text-xs font-semibold uppercase tracking-[0.12em] text-ink-muted">
            Join URL
          </span>
          <input
            type="url"
            id="joinUrl"
            value={joinUrl}
            onChange={handleJoinUrlChange}
            placeholder="https://us02web.zoom.us/j/..."
            className="w-full rounded-xl border border-line bg-panel px-3 py-2.5 text-sm text-ink placeholder:text-ink-muted transition focus:border-lime focus:outline-none focus:ring-4 focus:ring-lime/20"
          />
        </label>
      </div>

      <div className="flex items-center gap-3">
        <div className="h-px flex-1 bg-line/70"></div>
        <button
          type="button"
          onClick={showManual}
          className="rounded-full border border-line/70 bg-panel px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-ink-muted cursor-pointer"
        >
          or enter details
        </button>
        <div className="h-px flex-1 bg-line/70"></div>
      </div>

      {showManualFields === true ? (
        <div className="grid gap-4 rounded-2xl border border-line/70 bg-canvas p-4 sm:grid-cols-2 sm:p-5">
          {/* Manual fields stay optional because most integrations can be resolved from a join URL. */}
          <label htmlFor="meetingId" className="block space-y-2">
            <span className="text-xs font-semibold uppercase tracking-[0.12em] text-ink-muted">
              Meeting ID
            </span>
            <input
              type="text"
              id="meetingId"
              value={meetingId}
              onChange={handleMeetingIdChange}
              placeholder="800 1234 5678"
              className="w-full rounded-xl border border-line bg-panel px-3 py-2.5 text-sm text-ink placeholder:text-ink-muted transition focus:border-lime focus:outline-none focus:ring-4 focus:ring-lime/20"
            />
          </label>

          <label htmlFor="password" className="block space-y-2">
            <span className="text-xs font-semibold uppercase tracking-[0.12em] text-ink-muted">
              Passcode
            </span>
            <input
              type="password"
              id="password"
              value={password}
              onChange={handlePasswordChange}
              placeholder="a1B2c3"
              className="w-full rounded-xl border border-line bg-panel px-3 py-2.5 text-sm text-ink placeholder:text-ink-muted transition focus:border-lime focus:outline-none focus:ring-4 focus:ring-lime/20"
            />
          </label>
        </div>
      ) : null}

      {error ? (
        <p className="rounded-xl border border-red-300/60 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full rounded-xl bg-accent px-4 py-3 text-sm font-semibold text-accent-contrast transition hover:bg-accent-hover focus:outline-none focus:ring-4 focus:ring-accent/25 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isSubmitting ? "Joining..." : "Join Meeting"}
      </button>
    </form>
  );
}
