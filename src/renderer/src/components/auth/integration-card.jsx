import { useState } from "react";
import { BiChevronDown, BiChevronRight, BiLogIn, BiPlay } from "react-icons/bi";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

export function ZoomForm({ onSubmit }) {
  const [meetingId, setMeetingId] = useState("");
  const [password, setPassword] = useState("");
  const [joinUrl, setJoinUrl] = useState("");
  const [showManual, setShowManual] = useState(false);
  const { t } = useTranslation();

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
          {t("join_url_label")}
        </label>
        <input
          type="url"
          id="joinUrl"
          value={joinUrl}
          onChange={(e) => setJoinUrl(e.target.value)}
          placeholder={t("join_url_zoom_placeholder")}
          className="block w-full px-3 py-2 text-sm rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
        />
      </div>

      <button
        type="button"
        onClick={() => setShowManual(!showManual)}
        className="w-full relative flex items-center justify-center py-2 group focus:outline-none cursor-pointer"
      >
        <div className="absolute inset-0 flex items-center" aria-hidden="true">
          <div className="w-full border-t border-zinc-200 dark:border-zinc-700"></div>
        </div>
        <div className="relative flex items-center gap-1 bg-white dark:bg-zinc-900 px-2 text-[10px] font-bold text-zinc-400 uppercase group-hover:text-zinc-600 dark:group-hover:text-zinc-300 transition-colors">
          <span>{t("or_type_in")}</span>
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
              {t("meeting_id_label")}
            </label>
            <input
              type="text"
              id="meetingId"
              value={meetingId}
              onChange={(e) => setMeetingId(e.target.value)}
              placeholder={t("meeting_id_placeholder")}
              className="block w-full px-3 py-2 text-sm rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
            />
          </div>

          <div>
            <label
              htmlFor="password"
              className="block text-xs font-bold text-zinc-500 uppercase tracking-wider mb-1.5"
            >
              {t("passcode_label")}
            </label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={t("passcode_placeholder")}
              className="block w-full px-3 py-2 text-sm rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
            />
          </div>
        </div>
      )}

      <div className="pt-2">
        <button
          type="submit"
          className="w-full px-4 py-2.5 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 active:bg-blue-800 transition-colors shadow-sm cursor-pointer"
        >
          {t("join_zoom_btn")}
        </button>
      </div>
    </form>
  );
}

export function StandaloneForm({ onSubmit }) {
  const [joinUrl, setJoinUrl] = useState("");
  const { t } = useTranslation();

  const handleJoinSubmit = (e) => {
    e.preventDefault();
    onSubmit({ joinUrl, mode: "join" });
  };

  return (
    <form onSubmit={handleJoinSubmit} className="space-y-4">
      <p className="text-center text-sm text-zinc-500 dark:text-zinc-400 mb-3">
        {t("standalone_mode_description")}
      </p>
      <div>
        <label
          htmlFor="joinUrl"
          className="block text-xs font-bold text-zinc-500 uppercase tracking-wider mb-1.5"
        >
          {t("join_url_label")}
        </label>
        <input
          type="url"
          id="joinUrl"
          value={joinUrl}
          onChange={(e) => setJoinUrl(e.target.value)}
          placeholder={t("join_url_standalone_placeholder")}
          className="block w-full px-3 py-2 text-sm rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
        />
      </div>
      <button
        type="submit"
        className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 transition-colors cursor-pointer"
      >
        <BiLogIn className="w-5 h-5" />
        {t("join_standalone_btn")}
      </button>

      <div className="flex items-center">
        <div className="flex-grow border-t border-zinc-300 dark:border-zinc-700"></div>
        <span className="flex-shrink mx-4 text-sm text-zinc-500 dark:text-zinc-400">
          {t("or_divider")}
        </span>
        <div className="flex-grow border-t border-zinc-300 dark:border-zinc-700"></div>
      </div>

      <div className="text-center">
        <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-3">
          {t("host_mode_description")}
        </p>
        <Link
          to="/standalone/host"
          className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-green-600/90 text-white font-semibold rounded-lg hover:bg-green-700/90 transition-colors cursor-pointer"
        >
          <BiPlay className="w-6 h-6" />
          {t("start_new_meeting_btn")}
        </Link>
      </div>
    </form>
  );
}
