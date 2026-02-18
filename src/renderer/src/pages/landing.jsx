import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ZoomForm,
  StandaloneForm,
} from "../components/auth/integration-card.jsx";
import { BiLogoZoom, BiCalendar, BiUser } from "react-icons/bi";
import { useTranslation } from "react-i18next";
import { useCalendar } from "../hooks/use-calendar.js";
import { useCalendarAutoSync } from "../hooks/use-calendar-auto-sync.js";
import { usePendingZoomLink } from "../hooks/use-pending-zoom-link.js";
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

  useCalendarAutoSync(syncCalendar);
  usePendingZoomLink(t);

  const handleJoin = async (data, source = "manual") => {
    setError(null);
    try {
      let response;

      if (source === "calendar") {
        response = await window.electron.joinCalendarSession({
          meetingId: data.id,
          joinUrl: data.join_url,
          startTime: data.start_time,
        });
      } else {
        if (integration === "zoom") {
          response = await window.electron.joinZoom({
            meetingid: data.meetingId || null,
            meetingpass: data.password || null,
            join_url: data.joinUrl || null,
          });
        } else if (integration === "standalone") {
          response = await window.electron.joinStandalone({
            host: data.mode === "host",
            join_url: data.joinUrl,
          });
        }
      }

      if (response.status !== "ok") {
        throw new Error(response.message || t("login_error_generic"));
      }

      const responseData = response.data;

      const { sessionId, token, type, joinUrl } = responseData;

      const isHost = integration === "standalone" && data.mode === "host";

      navigate(
        `/sessions/${type}/${encodeURIComponent(sessionId)}?token=${token}${isHost ? "&isHost=true" : ""}`,
        { state: { joinUrl } },
      );
    } catch (err) {
      console.error("Join failed:", err);
      setError(err.message || t("login_error_generic"));
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

  const renderIntegrationForm = () => {
    switch (integration) {
      case "zoom":
        return <ZoomForm onSubmit={(data) => handleJoin(data, "manual")} />;
      case "standalone":
        return (
          <StandaloneForm onSubmit={(data) => handleJoin(data, "manual")} />
        );
      default:
        return null;
    }
  };

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
          <SidebarItem
            id="standalone"
            label={t("integration_standalone")}
            icon={<BiUser className="h-5 w-5" />}
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
              onAppJoin={(event) => handleJoin(event, "calendar")}
            />
          </div>
        ) : (
          <div className="flex-1 p-6 overflow-y-auto">
            <div className="max-w-md mx-auto">
              {renderIntegrationForm()}

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
