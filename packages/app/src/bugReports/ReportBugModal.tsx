import { useEffect, useMemo, useState } from "react";
import { useAppInfo } from "../app/AppInfoContext";
import { useAuth } from "../auth/AuthContext";
import { collectClientMetadata } from "./clientMetadata";
import {
  buildClientLogFileContent,
  getClientLogSnapshot,
  writeClientLog,
} from "./clientLogger";
import { submitBugReport } from "../hooks/bugReports";
import { ApiError } from "../hooks/api";
import { useNotifications } from "../notifications/NotificationContext";
import { useAppRoute } from "../routing/RouteContext";

type ReportBugModalProps = {
  isOpen: boolean;
  onClose: () => void;
};

/**
 * Modal form for collecting a bug report with client diagnostics.
 */
export function ReportBugModal({ isOpen, onClose }: ReportBugModalProps) {
  const { clientType } = useAppInfo();
  const { route } = useAppRoute();
  const { tenantId, tenantName, user } = useAuth();
  const { notify } = useNotifications();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const metadata = useMemo(
    () => collectClientMetadata(clientType),
    [clientType],
  );
  const attachedLogCount = isOpen ? getClientLogSnapshot().length : 0;

  useEffect(() => {
    if (isOpen) {
      writeClientLog("info", "Bug report modal opened", route);
    }
  }, [isOpen, route]);

  if (!isOpen) {
    return null;
  }

  const resetAndClose = () => {
    setTitle("");
    setDescription("");
    onClose();
  };

  const onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);

    try {
      writeClientLog("info", "Submitting bug report", title || "untitled");
      const clientLogs = getClientLogSnapshot();
      const clientLogFileName = `bug-report-${new Date().toISOString().replace(/[:.]/g, "-")}.log`;
      const clientLogFileContent = buildClientLogFileContent(clientLogs, {
        title,
        route,
        userName: user?.name || null,
        userEmail: user?.email || null,
        tenantName: tenantName || tenantId || null,
        clientType: metadata.clientType,
        osPlatform: metadata.osPlatform,
        appVersion: metadata.appVersion,
        browserName: metadata.browserName,
        browserVersion: metadata.browserVersion,
      });

      await submitBugReport({
        title,
        description,
        currentRoute: route,
        clientLogFileName,
        clientLogFileContent,
        clientMetadata: metadata,
        clientLogs,
      });
      writeClientLog("info", "Bug report submitted successfully", title || "untitled");
      notify({
        title: "Bug Report Sent",
        message: "Thanks - your bug report was submitted.",
        variant: "success",
      });
      setTitle("");
      setDescription("");
    } catch (submissionError) {
      writeClientLog("error", "Bug report submission failed", submissionError);
      notify({
        title: "Bug Report Failed",
        message:
          submissionError instanceof ApiError
            ? submissionError.message
            : "Failed to submit bug report.",
        variant: "error",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[70] overflow-y-auto bg-ink/55 px-4 py-6 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label="Report Bug"
      onClick={() => {
        if (!isSubmitting) {
          resetAndClose();
        }
      }}
    >
      <div
        className="mx-auto w-full max-w-2xl rounded-3xl border border-line/80 bg-panel/95 p-6 shadow-panel"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-ink-muted">
              Diagnostics
            </p>
            <h2 className="mt-1 text-xl font-semibold text-ink">Report Bug</h2>
            <p className="mt-2 text-sm text-ink-muted">
              Send a short description and the latest client logs so the super-admin team can investigate.
            </p>
          </div>
          <button
            type="button"
            onClick={resetAndClose}
            disabled={isSubmitting}
            className="rounded-xl border border-line px-3 py-2 text-sm font-semibold text-ink transition hover:border-lime hover:text-lime disabled:cursor-not-allowed disabled:opacity-50"
          >
            Close
          </button>
        </div>

        <form className="mt-6 max-h-[calc(100dvh-10rem)] space-y-4 overflow-y-auto pr-1" onSubmit={onSubmit}>
          <div className="grid gap-3 rounded-2xl border border-line bg-canvas p-4 text-sm text-ink-muted sm:grid-cols-2">
            <p>
              User: <span className="font-semibold text-ink">{user?.name || user?.email || user?.id || "Unknown"}</span>
            </p>
            <p>
              Email: <span className="font-semibold text-ink">{user?.email || "Unavailable"}</span>
            </p>
            <p>
              Tenant: <span className="font-semibold text-ink">{tenantName || tenantId || "Unavailable"}</span>
            </p>
            <p>
              Role: <span className="font-semibold text-ink">{user?.role || "Unknown"}</span>
            </p>
            <p>
              Client: <span className="font-semibold uppercase text-ink">{metadata.clientType}</span>
            </p>
            <p>
              Platform: <span className="font-semibold uppercase text-ink">{metadata.osPlatform}</span>
            </p>
            <p>
              App Version: <span className="font-semibold text-ink">{metadata.appVersion}</span>
            </p>
            <p>
              Route: <span className="font-semibold text-ink">{route}</span>
            </p>
            <p className="sm:col-span-2">
              Browser: <span className="font-semibold text-ink">{metadata.browserName ? `${metadata.browserName} ${metadata.browserVersion || ""}`.trim() : "Unavailable"}</span>
            </p>
            <p className="sm:col-span-2">
              Attached Logs: <span className="font-semibold text-ink">{attachedLogCount}</span>
            </p>
          </div>

          <label className="block space-y-1">
            <span className="text-xs font-semibold uppercase tracking-[0.12em] text-ink-muted">
              Title
            </span>
            <input
              value={title}
              onChange={(event: any) => setTitle(String(event.currentTarget.value))}
              required
              maxLength={200}
              placeholder="Short summary of the problem"
              className="w-full rounded-xl border border-line bg-canvas px-3 py-2 text-sm text-ink placeholder:text-ink-muted focus:border-lime focus:outline-none focus:ring-4 focus:ring-lime/20"
            />
          </label>

          <label className="block space-y-1">
            <span className="text-xs font-semibold uppercase tracking-[0.12em] text-ink-muted">
              What happened?
            </span>
            <textarea
              value={description}
              onChange={(event: any) =>
                setDescription(String(event.currentTarget.value))
              }
              required
              rows={6}
              maxLength={5000}
              placeholder="What were you trying to do, and what did you expect to happen?"
              className="w-full rounded-xl border border-line bg-canvas px-3 py-2 text-sm text-ink placeholder:text-ink-muted focus:border-lime focus:outline-none focus:ring-4 focus:ring-lime/20"
            />
          </label>
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={resetAndClose}
              disabled={isSubmitting}
              className="rounded-xl border border-line px-4 py-2 text-sm font-semibold text-ink transition hover:border-lime hover:text-lime disabled:cursor-not-allowed disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="rounded-xl border border-lime/50 bg-lime/10 px-4 py-2 text-sm font-semibold text-lime transition hover:border-lime hover:bg-lime/20 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isSubmitting ? "Submitting..." : "Submit Report"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
