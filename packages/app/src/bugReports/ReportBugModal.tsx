import { useEffect, useMemo, useState } from "react";
import { useAppInfo } from "../contexts/AppInfoContext";
import { useAuth } from "../contexts/AuthContext";
import { useI18n } from "../contexts/UiI18nContext";
import { useNotifications } from "../contexts/NotificationContext";
import { useAppRoute } from "../contexts/RouteContext";
import { collectClientMetadata } from "./clientMetadata";
import {
  buildClientLogFileContent,
  getClientLogSnapshot,
  writeClientLog,
} from "./clientLogger";
import { submitBugReport } from "../hooks/bugReports";
import { ApiError } from "../hooks/api";

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
  const { t } = useI18n();
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
        title: t("bugReport.sentTitle"),
        message: t("bugReport.sentMessage"),
        variant: "success",
      });
      setTitle("");
      setDescription("");
    } catch (submissionError) {
      writeClientLog("error", "Bug report submission failed", submissionError);
      notify({
        title: t("bugReport.failedTitle"),
        message:
          submissionError instanceof ApiError
            ? submissionError.message
            : t("bugReport.failedMessage"),
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
      aria-label={t("bugReport.title")}
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
              {t("bugReport.section")}
            </p>
            <h2 className="mt-1 text-xl font-semibold text-ink">{t("bugReport.title")}</h2>
            <p className="mt-2 text-sm text-ink-muted">
              {t("bugReport.subtitle")}
            </p>
          </div>
          <button
            type="button"
            onClick={resetAndClose}
            disabled={isSubmitting}
            className="rounded-xl border border-line px-3 py-2 text-sm font-semibold text-ink transition hover:border-lime hover:text-lime disabled:cursor-not-allowed disabled:opacity-50"
          >
            {t("common.close")}
          </button>
        </div>

        <form className="mt-6 max-h-[calc(100dvh-10rem)] space-y-4 overflow-y-auto pr-1" onSubmit={onSubmit}>
          <div className="grid gap-3 rounded-2xl border border-line bg-canvas p-4 text-sm text-ink-muted sm:grid-cols-2">
            <p>
              {t("bugReport.user")}: <span className="font-semibold text-ink">{user?.name || user?.email || user?.id || t("bugReport.unknown")}</span>
            </p>
            <p>
              {t("bugReport.email")}: <span className="font-semibold text-ink">{user?.email || t("bugReport.unavailable")}</span>
            </p>
            <p>
              {t("bugReport.tenant")}: <span className="font-semibold text-ink">{tenantName || tenantId || t("bugReport.unavailable")}</span>
            </p>
            <p>
              {t("bugReport.role")}: <span className="font-semibold text-ink">{user?.role || t("bugReport.unknown")}</span>
            </p>
            <p>
              {t("bugReport.client")}: <span className="font-semibold uppercase text-ink">{metadata.clientType}</span>
            </p>
            <p>
              {t("bugReport.platform")}: <span className="font-semibold uppercase text-ink">{metadata.osPlatform}</span>
            </p>
            <p>
              {t("bugReport.appVersion")}: <span className="font-semibold text-ink">{metadata.appVersion}</span>
            </p>
            <p>
              {t("bugReport.route")}: <span className="font-semibold text-ink">{route}</span>
            </p>
            <p className="sm:col-span-2">
              {t("bugReport.browser")}: <span className="font-semibold text-ink">{metadata.browserName ? `${metadata.browserName} ${metadata.browserVersion || ""}`.trim() : t("bugReport.unavailable")}</span>
            </p>
            <p className="sm:col-span-2">
              {t("bugReport.attachedLogs")}: <span className="font-semibold text-ink">{attachedLogCount}</span>
            </p>
          </div>

          <label className="block space-y-1">
            <span className="text-xs font-semibold uppercase tracking-[0.12em] text-ink-muted">
               {t("bugReport.issueTitle")}
            </span>
            <input
              value={title}
              onChange={(event: any) => setTitle(String(event.currentTarget.value))}
              required
              maxLength={200}
              placeholder={t("bugReport.issueTitlePlaceholder")}
              className="w-full rounded-xl border border-line bg-canvas px-3 py-2 text-sm text-ink placeholder:text-ink-muted focus:border-lime focus:outline-none focus:ring-4 focus:ring-lime/20"
            />
          </label>

          <label className="block space-y-1">
            <span className="text-xs font-semibold uppercase tracking-[0.12em] text-ink-muted">
               {t("bugReport.description")}
            </span>
            <textarea
              value={description}
              onChange={(event: any) =>
                setDescription(String(event.currentTarget.value))
              }
              required
              rows={6}
              maxLength={5000}
              placeholder={t("bugReport.descriptionPlaceholder")}
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
              {t("common.cancel")}
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="rounded-xl border border-lime/50 bg-lime/10 px-4 py-2 text-sm font-semibold text-lime transition hover:border-lime hover:bg-lime/20 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isSubmitting ? t("bugReport.submitting") : t("bugReport.submit")}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
