import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ZoomForm } from "../components/auth/integration-card.jsx";
import { BiLogoZoom, BiCalendar } from "react-icons/bi";
import { useTranslation } from "react-i18next";
import { useCalendar } from "../hooks/use-calendar.js";
import { CalendarView } from "../components/calender/view.jsx";

const getCurrentWorkWeek = () => {
  const now = new Date();
  const day = now.getDay();
  const diff = now.getDate() - day + (day === 0 ? -6 : 1);

  const start = new Date(now);
  start.setDate(diff);
  start.setHours(0, 0, 0, 0);

  const end = new Date(start);
  end.setDate(start.getDate() + 4);
  end.setHours(23, 59, 59, 999);

  return { start, end };
};

export default function LandingPage() {
  const { t } = useTranslation();
  const [integration, setIntegration] = useState("calendar");
  const [error, setError] = useState(null);
  const [dateRange, setDateRange] = useState(getCurrentWorkWeek());
  const navigate = useNavigate();
  const {
    events,
    loading: calendarLoading,
    error: calendarError,
    syncCalendar,
  } = useCalendar(dateRange.start, dateRange.end);

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

  useEffect(() => {
    const checkPendingZoomLink = async () => {
      const needsLink = sessionStorage.getItem("zoom_link_pending");

      if (needsLink === "true") {
        try {
          console.log("Found pending Zoom link, attempting to link account...");
          alert(t("finishing_zoom_setup"));

          const response = await window.electron.linkPendingZoom();

          if (response.status !== "ok") {
            throw new Error(response.message || "Failed to link Zoom account.");
          }

          console.log("Zoom account linked successfully!");
          alert(t("zoom_linked_success"));
        } catch (error) {
          console.error("Zoom link error:", error);
          alert(t("zoom_link_failed", { error: error.message }));
        } finally {
          sessionStorage.removeItem("zoom_link_pending");
        }
      }
    };

    checkPendingZoomLink();
  }, []);

  const handleJoin = (type, sessionId, token) => {
    navigate(
      `/sessions/${type}/${encodeURIComponent(sessionId)}?token=${token}`,
    );
  };

  const handleZoomSubmit = async ({ meetingId, password, joinUrl }) => {
    setError(null);

    if (!joinUrl && !meetingId) {
      setError(t("error_missing_zoom_input"));
      return;
    }

    try {
      const response = await window.electron.joinZoom({
        meetingid: meetingId || null,
        meetingpass: password || null,
        join_url: joinUrl || null,
      });

      if (response.status !== "ok") {
        throw new Error(response.message || t("error_auth_failed"));
      }

      const data = response.data;
      console.log("Server response:", data);
      const sessionId = data.sessionId;
      const token = data.token;

      if (!sessionId) {
        throw new Error(t("error_no_session_id"));
      }

      if (!token) {
        throw new Error(t("error_no_token"));
      }

      handleJoin("zoom", sessionId, token);
    } catch (err) {
      console.error("Authentication failed:", err);
      setError(err.message);
    }
  };

  const handleCalendarJoin = async (event) => {
    try {
      const payload = {
        meetingId: event.id,
        joinUrl: event.join_url,
        startTime: event.start_time,
      };

      const response = await window.electron.joinCalendarSession(payload);

      const isSuccess =
        response.status === "ok" ||
        (response.data && response.data.sessionId && response.data.token);

      if (!isSuccess) {
        const statusMsg = response.code ? ` (Status ${response.code})` : "";
        throw new Error(
          (response.message || "Failed to initialize session") + statusMsg,
        );
      }

      const data = response.data;
      const { sessionId, token, type } = data;

      navigate(
        `/sessions/${type}/${encodeURIComponent(sessionId)}?token=${token}`,
      );
    } catch (err) {
      console.error("Failed to quick-join:", err);
      setError("Failed to start assistant. Please try again.");
    }
  };

  const SidebarItem = ({ id, label, icon, activeClass }) => (
    <button
      onClick={() => setIntegration(id)}
      className={`cursor-pointer w-full flex items-center gap-3 px-4 py-3 text-sm font-medium transition-colors border-r-2 ${
        integration === id
          ? activeClass
          : "border-transparent text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800"
      }`}
    >
      {icon}
      <span>{label}</span>
    </button>
  );

  return (
    <div className="flex-grow flex">
      {/* Sidebar */}
      <aside className="sticky top-16 h-[calc(100vh-4rem)] bg-zinc-50 dark:bg-zinc-900 border-r border-zinc-200 dark:border-zinc-800 pt-4">
        {/* Calendar Section */}
        <div className="px-4 mb-2">
          <h2 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">
            {t("calendar_join")}
          </h2>
        </div>
        <div className="flex flex-col">
          <SidebarItem
            id="calendar"
            label={t("calendar_view")}
            icon={<BiCalendar className="h-5 w-5" />}
            activeClass="border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300"
          />
        </div>

        <div className="flex items-center px-4 py-3">
          <div className="h-px flex-1 bg-zinc-200 dark:bg-zinc-800"></div>
          <span className="px-3 text-[10px] font-bold text-zinc-400 dark:text-zinc-600 uppercase tracking-widest">
            {t("or_divider")}
          </span>
          <div className="h-px flex-1 bg-zinc-200 dark:bg-zinc-800"></div>
        </div>

        {/* Integration Section */}
        <div className="px-4 mb-2">
          <h2 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">
            {t("manual_join")}
          </h2>
        </div>
        <div className="flex flex-col">
          <SidebarItem
            id="zoom"
            label={t("integration_zoom")}
            icon={<BiLogoZoom className="h-5 w-5" />}
            activeClass="border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300"
          />
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 bg-white dark:bg-zinc-900/50 overflow-hidden flex flex-col">
        {integration === "calendar" ? (
          <div className="h-full p-6 overflow-hidden">
            <CalendarView
              events={events}
              loading={calendarLoading}
              error={calendarError}
              onSync={syncCalendar}
              startDate={dateRange.start}
              endDate={dateRange.end}
              onDateChange={setDateRange}
              onAppJoin={handleCalendarJoin}
            />
          </div>
        ) : (
          <div className="flex-1 p-6 overflow-y-auto">
            <div className="max-w-md mx-auto">
              {integration === "zoom" && (
                <ZoomForm onSubmit={handleZoomSubmit} />
              )}

              {error && (
                <div className="mt-3 p-3 text-sm text-red-600 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-100 dark:border-red-900/30 text-center">
                  {error}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
