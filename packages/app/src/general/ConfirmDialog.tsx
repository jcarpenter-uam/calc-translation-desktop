import { useEffect } from "react";
import { createPortal } from "react-dom";
import { useI18n } from "../contexts/UiI18nContext";

type ConfirmDialogTone = "default" | "danger";

type ConfirmDialogProps = {
  isOpen: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: ConfirmDialogTone;
  isBusy?: boolean;
  onConfirm: () => void;
  onClose: () => void;
};

/**
 * Shared confirmation dialog for destructive or sensitive actions.
 */
export function ConfirmDialog({
  isOpen,
  title,
  description,
  confirmLabel,
  cancelLabel,
  tone = "default",
  isBusy = false,
  onConfirm,
  onClose,
}: ConfirmDialogProps) {
  const { t } = useI18n();
  const resolvedConfirmLabel = confirmLabel || t("confirm.confirm");
  const resolvedCancelLabel = cancelLabel || t("common.cancel");

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
      if (event.key === "Escape" && !isBusy) {
        onClose();
      }
    };

    browser.addEventListener?.("keydown", handleKeyDown);

    return () => {
      browser.removeEventListener?.("keydown", handleKeyDown);
    };
  }, [isBusy, isOpen, onClose]);

  if (!isOpen) {
    return null;
  }

  const browser = globalThis as typeof globalThis & {
    document?: {
      body?: Element | DocumentFragment;
    };
  };
  const portalTarget = browser.document?.body;

  const confirmButtonClassName =
    tone === "danger"
      ? "border-red-400/60 bg-red-500/10 text-red-200 hover:border-red-300 hover:bg-red-500/20"
      : "border-lime/50 bg-lime/10 text-lime hover:border-lime hover:bg-lime/20";

  const dialog = (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-ink/55 px-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label={title}
      onClick={() => {
        if (!isBusy) {
          onClose();
        }
      }}
    >
      <div
        className="w-full max-w-md rounded-3xl border border-line/80 bg-panel/95 p-6 shadow-panel"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-ink-muted">
            {t("confirm.action")}
          </p>
          <div className="space-y-2">
            <h2 className="text-xl font-semibold text-ink">{title}</h2>
            <p className="text-sm leading-6 text-ink-muted">{description}</p>
          </div>
        </div>

        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onClose}
            disabled={isBusy}
            className="rounded-xl border border-line px-4 py-2 text-sm font-semibold text-ink transition hover:border-lime hover:text-lime disabled:cursor-not-allowed disabled:opacity-50"
          >
            {resolvedCancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isBusy}
            className={`rounded-xl border px-4 py-2 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-50 ${confirmButtonClassName}`}
          >
            {isBusy ? t("common.working") : resolvedConfirmLabel}
          </button>
        </div>
      </div>
    </div>
  );

  if (!portalTarget) {
    return dialog;
  }

  return createPortal(dialog, portalTarget);
}
