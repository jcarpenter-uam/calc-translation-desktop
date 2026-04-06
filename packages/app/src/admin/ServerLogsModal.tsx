import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useI18n } from "../contexts/UiI18nContext";
import { useServerLogs } from "../hooks/serverLogs";

type ServerLogsModalProps = {
  isOpen: boolean;
  onClose: () => void;
};

type LogTab = "combined" | "error";

/**
 * Super-admin modal for inspecting recent server logs.
 */
export function ServerLogsModal({ isOpen, onClose }: ServerLogsModalProps) {
  const { t } = useI18n();
  const [activeTab, setActiveTab] = useState<LogTab>("combined");
  const logsQuery = useServerLogs(isOpen, 300);

  useEffect(() => {
    if (!isOpen) {
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
    return () => browser.removeEventListener?.("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) {
    return null;
  }

  const browser = globalThis as typeof globalThis & {
    document?: { body?: Element | DocumentFragment };
  };
  const portalTarget = browser.document?.body;
  const activeLog = activeTab === "combined" ? logsQuery.data?.combined : logsQuery.data?.error;

  const dialog = (
    <div
      className="fixed inset-0 z-[70] overflow-y-auto bg-ink/55 px-4 py-6 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label={t("admin.logs.title")}
      onClick={onClose}
    >
      <div
        className="mx-auto flex max-h-[calc(100dvh-3rem)] w-full max-w-5xl flex-col overflow-hidden rounded-3xl border border-line/80 bg-panel/95 p-6 shadow-panel"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-ink-muted">
              {t("admin.logs.section")}
            </p>
            <h2 className="mt-1 text-xl font-semibold text-ink">{t("admin.logs.title")}</h2>
            <p className="mt-2 text-sm text-ink-muted">
              {t("admin.logs.subtitle")}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-line px-3 py-2 text-sm font-semibold text-ink transition hover:border-lime hover:text-lime"
          >
            {t("common.close")}
          </button>
        </div>

        <div className="mt-4 flex items-center gap-2">
          {(["combined", "error"] as const).map((tab) => {
            const isActive = activeTab === tab;

            return (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveTab(tab)}
                className={`rounded-full border px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.12em] transition ${
                  isActive
                    ? "border-lime/50 bg-lime/10 text-lime"
                    : "border-line text-ink-muted hover:border-lime hover:text-lime"
                }`}
              >
                {tab === "combined" ? t("admin.logs.combined") : t("admin.logs.error")}
              </button>
            );
          })}
          <p className="ml-auto text-xs text-ink-muted">
            {activeLog?.fileName || t("admin.logs.noFile")}
          </p>
        </div>

        {logsQuery.error ? (
          <div className="mt-4 rounded-xl border border-red-400/40 bg-red-500/10 px-3 py-2 text-sm text-red-200">
            {logsQuery.error.message}
          </div>
        ) : null}

        <div className="mt-4 min-h-0 flex-1 overflow-auto rounded-2xl border border-line bg-canvas p-4">
          {logsQuery.isLoading ? (
            <p className="text-sm text-ink-muted">{t("admin.logs.loading")}</p>
          ) : (
            <pre className="whitespace-pre-wrap break-words font-mono text-xs text-ink-muted">
              {activeLog?.content || t("admin.logs.noContent")}
            </pre>
          )}
        </div>
      </div>
    </div>
  );

  return portalTarget ? createPortal(dialog, portalTarget) : dialog;
}
