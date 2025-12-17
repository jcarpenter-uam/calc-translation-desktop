import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/auth";
import { ZoomForm, TestForm } from "../components/auth/integration-card.jsx";
import { BiLogoZoom, BiSolidFlask } from "react-icons/bi";

export default function LandingPage() {
  const { user } = useAuth();
  const [integration, setIntegration] = useState("zoom");
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const checkPendingZoomLink = async () => {
      const needsLink = sessionStorage.getItem("zoom_link_pending");

      if (needsLink === "true") {
        try {
          console.log("Found pending Zoom link, attempting to link account...");
          alert("Finishing Zoom account setup...");

          const response = await window.electron.linkPendingZoom();

          if (response.status !== "ok") {
            throw new Error(response.message || "Failed to link Zoom account.");
          }

          console.log("Zoom account linked successfully!");
          alert("Zoom account linked successfully!");
        } catch (error) {
          console.error("Zoom link error:", error);
          alert(
            `Failed to link Zoom: ${error.message}. Please try reconnecting from your profile.`,
          );
        } finally {
          sessionStorage.removeItem("zoom_link_pending");
        }
      }
    };

    checkPendingZoomLink();
  }, []);

  const handleJoin = (type, sessionId, token) => {
    navigate(`/sessions/${type}/${sessionId}?token=${token}`);
  };

  const handleZoomSubmit = async ({ meetingId, password, joinUrl }) => {
    setError(null);

    if (!joinUrl && !meetingId) {
      setError("Please provide either a Join URL or a Meeting ID.");
      return;
    }

    try {
      const response = await window.electron.joinZoom({
        meetingid: meetingId || null,
        meetingpass: password || null,
        join_url: joinUrl || null,
      });

      if (response.status !== "ok") {
        throw new Error(
          response.message ||
            "Authentication failed. Please check your inputs.",
        );
      }

      const data = response.data;
      console.log("Server response:", data);
      const sessionId = data.meetinguuid;
      const token = data.token;

      if (!sessionId || !token) {
        throw new Error("Server did not return a valid session.");
      }

      handleJoin("zoom", sessionId, token);
    } catch (err) {
      console.error("Authentication failed:", err);
      setError(err.message);
    }
  };

  const handleTestSubmit = async ({ sessionId }) => {
    setError(null);

    if (!sessionId) {
      setError("Please provide a Session ID.");
      return;
    }

    try {
      const response = await window.electron.joinTest({
        session_id: sessionId,
      });

      if (response.status !== "ok") {
        throw new Error(
          response.message ||
            "Test authentication failed. Please check your session ID.",
        );
      }

      const data = response.data;
      console.log("Server response:", data);
      const returnedSessionId = data.meetinguuid;
      const token = data.token;

      if (!returnedSessionId || !token) {
        throw new Error("Server did not return a valid session.");
      }

      handleJoin("test", returnedSessionId, token);
    } catch (err) {
      console.error("Test authentication failed:", err);
      setError(err.message);
    }
  };

  const renderForm = () => {
    if (integration === "zoom") {
      return <ZoomForm onSubmit={handleZoomSubmit} />;
    }
    if (integration === "test") {
      return <TestForm onSubmit={handleTestSubmit} />;
    }
    return null;
  };

  const SidebarItem = ({ id, label, icon, activeClass }) => (
    <button
      onClick={() => setIntegration(id)}
      className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-medium transition-colors border-r-2 ${
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
    <div className="flex-grow flex overflow-hidden">
      <aside className="w-1/3 min-w-[200px] bg-zinc-50 dark:bg-zinc-900 border-r border-zinc-200 dark:border-zinc-800 pt-4">
        <div className="px-4 mb-2">
          <h2 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">
            Integration
          </h2>
        </div>
        <div className="flex flex-col">
          <SidebarItem
            id="zoom"
            label="Zoom Meeting"
            icon={<BiLogoZoom className="h-5 w-5" />}
            activeClass="border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300"
          />
          {user?.is_admin && (
            <SidebarItem
              id="test"
              label="Test Session"
              icon={<BiSolidFlask className="h-5 w-5" />}
              activeClass="border-green-500 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300"
            />
          )}
        </div>
      </aside>

      <div className="flex-1 p-6 bg-white dark:bg-zinc-900/50 overflow-y-auto">
        <div className="max-w-md mx-auto">
          {renderForm()}
          {error && (
            <div className="mt-3 p-2 text-xs text-red-600 bg-red-50 dark:bg-red-900/20 rounded border border-red-100 dark:border-red-900/30 text-center">
              {error}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
