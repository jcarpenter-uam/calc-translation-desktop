import { useState } from "react";
import { BiChevronDown, BiChevronRight } from "react-icons/bi";

export function ZoomForm({ onSubmit }) {
  const [meetingId, setMeetingId] = useState("");
  const [password, setPassword] = useState("");
  const [joinUrl, setJoinUrl] = useState("");
  const [showManual, setShowManual] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit({ meetingId, password, joinUrl });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label
          htmlFor="joinUrl"
          className="block text-xs font-bold text-zinc-500 uppercase tracking-wider mb-1.5"
        >
          Join via URL
        </label>
        <input
          type="url"
          id="joinUrl"
          value={joinUrl}
          onChange={(e) => setJoinUrl(e.target.value)}
          placeholder="Paste Zoom Link here..."
          className="block w-full px-3 py-2 text-sm rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
        />
      </div>

      <button
        type="button"
        onClick={() => setShowManual(!showManual)}
        className="w-full relative flex items-center justify-center py-2 group focus:outline-none"
      >
        <div className="absolute inset-0 flex items-center" aria-hidden="true">
          <div className="w-full border-t border-zinc-200 dark:border-zinc-700"></div>
        </div>
        <div className="relative flex items-center gap-1 bg-white dark:bg-zinc-900 px-2 text-[10px] font-bold text-zinc-400 uppercase group-hover:text-zinc-600 dark:group-hover:text-zinc-300 transition-colors">
          <span>OR Join Manually</span>
          {showManual ? (
            <BiChevronDown className="w-3 h-3" />
          ) : (
            <BiChevronRight className="w-3 h-3" />
          )}
        </div>
      </button>

      {showManual && (
        <div className="grid grid-cols-2 gap-4 animate-in fade-in slide-in-from-top-2 duration-200">
          <div>
            <label
              htmlFor="meetingId"
              className="block text-xs font-bold text-zinc-500 uppercase tracking-wider mb-1.5"
            >
              Meeting ID
            </label>
            <input
              type="text"
              id="meetingId"
              value={meetingId}
              onChange={(e) => setMeetingId(e.target.value)}
              placeholder="000 000 0000"
              className="block w-full px-3 py-2 text-sm rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
            />
          </div>

          <div>
            <label
              htmlFor="password"
              className="block text-xs font-bold text-zinc-500 uppercase tracking-wider mb-1.5"
            >
              Passcode
            </label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="• • • • • •"
              className="block w-full px-3 py-2 text-sm rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
            />
          </div>
        </div>
      )}

      <div className="pt-2">
        <button
          type="submit"
          className="w-full px-4 py-2.5 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 active:bg-blue-800 transition-colors shadow-sm"
        >
          Start Session
        </button>
      </div>
    </form>
  );
}

export function TestForm({ onSubmit }) {
  const [sessionId, setSessionId] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!sessionId) return;
    onSubmit({ sessionId });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label
          htmlFor="session-id"
          className="block text-xs font-bold text-zinc-500 uppercase tracking-wider mb-1.5"
        >
          Enter Test Session ID
        </label>
        <input
          type="text"
          id="session-id"
          value={sessionId}
          onChange={(e) => setSessionId(e.target.value)}
          placeholder="e.g., 'test-01'"
          required
          className="block w-full px-3 py-2 text-sm rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none transition-all"
        />
      </div>

      <div className="pt-2">
        <button
          type="submit"
          className="w-full px-4 py-2.5 bg-green-600 text-white text-sm font-semibold rounded-lg hover:bg-green-700 active:bg-green-800 transition-colors shadow-sm"
        >
          Join Test Session
        </button>
      </div>

      <p className="text-xs text-zinc-500 dark:text-zinc-400 text-center">
        This is for internal testing purposes only. It simulates a live session
        stream.
      </p>
    </form>
  );
}
