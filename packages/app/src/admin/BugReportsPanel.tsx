import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useI18n } from "../contexts/UiI18nContext";
import { useNotifications } from "../contexts/NotificationContext";
import {
  useBugReports,
  useUpdateBugReportStatus,
  type BugReport,
} from "../hooks/bugReports";
import { ApiError } from "../hooks/api";

type BugReportFilter = "all" | "open" | "resolved";

type BugReportDetailsModalProps = {
  report: BugReport | null;
  onClose: () => void;
  onStatusChange: (id: string, status: "open" | "resolved") => Promise<void>;
  isUpdating: boolean;
};

function BugReportDetailsModal({
  report,
  onClose,
  onStatusChange,
  isUpdating,
}: BugReportDetailsModalProps) {
  const { formatDateTime, t } = useI18n();
  useEffect(() => {
    if (!report) {
      return;
    }

    const browser = globalThis as typeof globalThis & {
      addEventListener?: (
        type: string,
        listener: (event: { key?: string }) => void,
      ) => void;
      removeEventListener?: (
        type: string,
        listener: (event: { key?: string }) => void,
      ) => void;
    };

    const handleKeyDown = (event: { key?: string }) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    browser.addEventListener?.("keydown", handleKeyDown);

    return () => {
      browser.removeEventListener?.("keydown", handleKeyDown);
    };
  }, [onClose, report]);

  if (!report) {
    return null;
  }

  const browser = globalThis as typeof globalThis & {
    document?: {
      body?: Element | DocumentFragment;
    };
  };
  const portalTarget = browser.document?.body;

  const dialog = (
    <div
      className="fixed inset-0 z-[70] overflow-y-auto bg-ink/55 px-4 py-6 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label={t("admin.bugs.reportAria", { title: report.title })}
      onClick={onClose}
    >
      <div
        className="mx-auto flex max-h-[calc(100dvh-3rem)] w-full max-w-4xl flex-col overflow-hidden rounded-3xl border border-line/80 bg-panel/95 p-6 shadow-panel"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-ink-muted">
              {t("admin.bugs.details")}
            </p>
            <h2 className="mt-1 text-xl font-semibold text-ink">{report.title}</h2>
            <p className="mt-2 text-sm text-ink-muted">
              {t("admin.bugs.submittedBy", {
                date: formatDateTime(report.createdAt, {
                  year: "numeric",
                  month: "short",
                  day: "numeric",
                  hour: "numeric",
                  minute: "2-digit",
                }),
                user: report.userName || report.userEmail || report.userId || t("admin.bugs.unknown"),
              })}
            </p>
          </div>
          <div className="flex flex-col items-end gap-2">
            <span
              className={`rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] ${
                report.status === "resolved"
                  ? "border-lime/40 bg-lime/10 text-lime"
                  : "border-amber-400/40 bg-amber-500/10 text-amber-200"
              }`}
            >
              {report.status}
            </span>
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-line px-3 py-2 text-sm font-semibold text-ink transition hover:border-lime hover:text-lime"
            >
              {t("common.close")}
            </button>
          </div>
        </div>

        <div className="mt-4 flex items-center justify-between rounded-2xl border border-line bg-canvas p-3">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-ink-muted">
            {t("admin.bugs.status")}
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={isUpdating || report.status === "open"}
              onClick={() => void onStatusChange(report.id, "open")}
              className="rounded-lg border border-line px-2.5 py-1.5 text-xs font-semibold text-ink transition hover:border-lime hover:text-lime disabled:cursor-not-allowed disabled:opacity-50"
            >
              {t("admin.bugs.markOpen")}
            </button>
            <button
              type="button"
              disabled={isUpdating || report.status === "resolved"}
              onClick={() => void onStatusChange(report.id, "resolved")}
              className="rounded-lg border border-lime/50 bg-lime/10 px-2.5 py-1.5 text-xs font-semibold text-lime transition hover:border-lime hover:bg-lime/20 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isUpdating ? t("admin.bugs.saving") : t("admin.bugs.markResolved")}
            </button>
          </div>
        </div>
        <div className="mt-6 grid min-h-0 flex-1 gap-6 overflow-y-auto lg:grid-cols-[0.9fr_1.1fr]">
          <div className="space-y-4">
            <div className="rounded-2xl border border-line bg-canvas p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-ink-muted">
                {t("admin.bugs.description")}
              </p>
              <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-ink">
                {report.description}
              </p>
            </div>

            <div className="grid gap-3 rounded-2xl border border-line bg-canvas p-4 text-sm text-ink-muted sm:grid-cols-2">
              <p>
                {t("bugReport.user")}: <span className="font-semibold text-ink">{report.userName || report.userId || t("admin.bugs.unknown")}</span>
              </p>
              <p>
                {t("bugReport.email")}: <span className="font-semibold text-ink">{report.userEmail || t("bugReport.unavailable")}</span>
              </p>
              <p>
                {t("bugReport.tenant")}: <span className="font-semibold text-ink">{report.tenantId || t("admin.bugs.none")}</span>
              </p>
              <p>
                {t("bugReport.role")}: <span className="font-semibold text-ink">{report.userRole || t("admin.bugs.unknown")}</span>
              </p>
              <p>
                {t("bugReport.client")}: <span className="font-semibold uppercase text-ink">{report.clientType}</span>
              </p>
              <p>
                {t("bugReport.platform")}: <span className="font-semibold uppercase text-ink">{report.osPlatform}</span>
              </p>
              <p>
                {t("admin.bugs.version")}: <span className="font-semibold text-ink">{report.appVersion}</span>
              </p>
              <p>
                {t("bugReport.route")}: <span className="font-semibold text-ink">{report.currentRoute || t("admin.bugs.unknown")}</span>
              </p>
              <p className="sm:col-span-2">
                {t("bugReport.browser")}: <span className="font-semibold text-ink">{report.browserName ? `${report.browserName} ${report.browserVersion || ""}`.trim() : t("bugReport.unavailable")}</span>
              </p>
            </div>
          </div>

          <div className="flex min-h-0 flex-col rounded-2xl border border-line bg-canvas p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-ink-muted">
              {t("admin.bugs.attachedLogs")}
            </p>
            <p className="mt-1 text-xs text-ink-muted">
              {report.clientLogFileName || t("admin.bugs.defaultLogFile")}
            </p>
            <div className="mt-3 min-h-0 flex-1 space-y-2 overflow-auto rounded-xl border border-line bg-panel p-3 font-mono text-xs text-ink-muted">
              {report.clientLogFileContent ? (
                <pre className="whitespace-pre-wrap break-words">
                  {report.clientLogFileContent}
                </pre>
              ) : report.clientLogs.length > 0 ? (
                report.clientLogs.map((entry, index) => (
                  <p key={`${report.id}-${index}`}>
                    <span className="text-ink">[{entry.level.toUpperCase()}]</span>{" "}
                    {entry.timestamp} {entry.message}
                  </p>
                ))
              ) : (
                 <p>{t("admin.bugs.noLogs")}</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  if (!portalTarget) {
    return dialog;
  }

  return createPortal(dialog, portalTarget);
}

/**
 * Super-admin review panel for submitted client bug reports.
 */
export function BugReportsPanel() {
  const { notify } = useNotifications();
  const { formatDateTime, t } = useI18n();
  const [filter, setFilter] = useState<BugReportFilter>("open");
  const [selectedReport, setSelectedReport] = useState<BugReport | null>(null);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const reportsQuery = useBugReports(true, filter);
  const updateBugReportStatus = useUpdateBugReportStatus();

  const handleStatusChange = async (id: string, status: "open" | "resolved") => {
    setIsUpdatingStatus(true);

    try {
      const response = await updateBugReportStatus(id, status);
      setSelectedReport(response.report);
      notify({
        title: t("admin.bugs.updatedTitle"),
        message:
          status === "resolved"
            ? t("admin.bugs.updatedResolved")
            : t("admin.bugs.updatedOpen"),
        variant: "success",
      });
    } catch (error) {
      notify({
        title: t("admin.bugs.updateFailedTitle"),
        message:
          error instanceof ApiError
            ? error.message
            : t("admin.bugs.updateFailedMessage"),
        variant: "error",
      });
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  return (
    <>
      <div className="space-y-4 rounded-xl border border-line bg-canvas p-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-ink-muted">
            {t("admin.bugs.section")}
          </p>
          <h2 className="mt-1 text-lg font-semibold text-ink">
            {t("admin.bugs.title")}
          </h2>
          <p className="mt-1 text-sm text-ink-muted">
            {t("admin.bugs.subtitle")}
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          {(["open", "resolved", "all"] as const).map((value) => {
            const isActive = filter === value;

            return (
              <button
                key={value}
                type="button"
                onClick={() => setFilter(value)}
                className={`rounded-full border px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.12em] transition ${
                  isActive
                    ? "border-lime/50 bg-lime/10 text-lime"
                    : "border-line text-ink-muted hover:border-lime hover:text-lime"
                }`}
              >
                {t(`admin.bugs.filter.${value}`)}
              </button>
            );
          })}
        </div>

        {reportsQuery.error ? (
          <div className="rounded-xl border border-red-400/40 bg-red-500/10 px-3 py-2 text-sm text-red-200">
            {reportsQuery.error.message}
          </div>
        ) : null}

        {reportsQuery.isLoading ? (
          <p className="text-sm text-ink-muted">{t("admin.bugs.loading")}</p>
        ) : null}

        {!reportsQuery.isLoading && (reportsQuery.data?.reports.length || 0) === 0 ? (
          <p className="rounded-xl border border-line bg-panel px-3 py-4 text-sm text-ink-muted">
            {t("admin.bugs.empty")}
          </p>
        ) : null}

        <div className="space-y-3">
          {(reportsQuery.data?.reports || []).map((report) => (
            <article
              key={report.id}
              className="flex flex-col gap-3 rounded-2xl border border-line bg-panel/70 p-4 md:flex-row md:items-center md:justify-between"
            >
              <div className="min-w-0 space-y-1">
                <h3 className="truncate text-base font-semibold text-ink">{report.title}</h3>
                <p className="text-sm text-ink-muted">
                  {report.userName || report.userEmail || report.userId || t("admin.bugs.unknown")} · {formatDateTime(report.createdAt, {
                    year: "numeric",
                    month: "short",
                    day: "numeric",
                    hour: "numeric",
                    minute: "2-digit",
                  })}
                </p>
                <p className="text-xs uppercase tracking-[0.12em] text-ink-muted">
                  {report.clientType} · {report.osPlatform} · {report.appVersion}
                </p>
              </div>

              <div className="flex items-center gap-2 self-start md:self-auto">
                <span
                  className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] ${
                    report.status === "resolved"
                      ? "border-lime/40 bg-lime/10 text-lime"
                      : "border-amber-400/40 bg-amber-500/10 text-amber-200"
                  }`}
                >
                  {report.status}
                </span>
                <button
                  type="button"
                  onClick={() => setSelectedReport(report)}
                  className="rounded-xl border border-line px-3 py-2 text-sm font-semibold text-ink transition hover:border-lime hover:text-lime"
                >
                  {t("admin.bugs.viewDetails")}
                </button>
              </div>
            </article>
          ))}
        </div>
      </div>

      <BugReportDetailsModal
        report={selectedReport}
        onClose={() => {
          setSelectedReport(null);
        }}
        onStatusChange={handleStatusChange}
        isUpdating={isUpdatingStatus}
      />
    </>
  );
}
