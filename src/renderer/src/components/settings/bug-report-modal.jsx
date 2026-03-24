import { useEffect, useState } from "react";
import { X } from "@phosphor-icons/react/dist/csr/X";
import log from "electron-log/renderer";
import Notification from "../misc/notification.jsx";

const INITIAL_FORM = {
  title: "",
  description: "",
  stepsToReproduce: "",
  expectedBehavior: "",
  actualBehavior: "",
};

function TextAreaField({ label, value, onChange, rows = 3, required = false }) {
  return (
    <label className="block space-y-1.5">
      <span className="text-sm font-medium text-zinc-800 dark:text-zinc-200">
        {label}
      </span>
      <textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        rows={rows}
        required={required}
        className="w-full rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
    </label>
  );
}

export default function BugReportModal({ isOpen, onClose }) {
  const [form, setForm] = useState(INITIAL_FORM);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [status, setStatus] = useState({ type: "idle", message: "" });
  const [toastVisible, setToastVisible] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      return undefined;
    }

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  useEffect(() => {
    if (status.type !== "success") {
      return undefined;
    }

    setToastVisible(true);
    const timer = window.setTimeout(() => {
      setToastVisible(false);
    }, 2400);

    return () => window.clearTimeout(timer);
  }, [status]);

  if (!isOpen) {
    return <Notification message="Bug report submitted" visible={toastVisible} />;
  }

  const setField = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setStatus({ type: "idle", message: "" });
    setIsSubmitting(true);
    log.info("Bug Report: Submitting report from renderer", {
      titleLength: form.title.trim().length,
      descriptionLength: form.description.trim().length,
      hasSteps: Boolean(form.stepsToReproduce.trim()),
      hasExpected: Boolean(form.expectedBehavior.trim()),
      hasActual: Boolean(form.actualBehavior.trim()),
    });

    try {
      const response = await window.electron.submitBugReport(form);
      if (response.status !== "ok") {
        throw new Error(response.message || "Failed to submit bug report");
      }

      setForm(INITIAL_FORM);
      setStatus({
        type: "success",
        message: "Bug report submitted. The desktop main log was attached automatically.",
      });
      log.info("Bug Report: Submission succeeded");
      onClose();
    } catch (error) {
      log.error("Bug Report: Submission failed", error.message || error);
      setStatus({
        type: "error",
        message: error.message || "Failed to submit bug report",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <div
        className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 p-4 transition-opacity"
        onClick={onClose}
        aria-modal="true"
        role="dialog"
      >
        <div
          className="w-full max-w-2xl max-h-[calc(100vh-2rem)] overflow-hidden rounded-lg bg-white dark:bg-zinc-900 shadow-2xl app-region-drag flex flex-col"
          onClick={(event) => event.stopPropagation()}
        >
          <header className="flex items-center justify-between border-b border-zinc-200/80 dark:border-zinc-700/80 px-4 py-3">
            <div>
              <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
                Report a bug
              </h3>
              <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                Submit a report and automatically attach the current desktop main log.
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-full text-zinc-600 dark:text-zinc-400 transition-colors app-region-no-drag hover:bg-red-500/90 hover:text-white focus:outline-none focus:ring-2 focus:ring-red-500 cursor-pointer"
              aria-label="Close bug report"
            >
              <X className="w-5 h-5" />
            </button>
          </header>

          <form className="px-6 py-4 space-y-4 overflow-y-auto app-region-no-drag" onSubmit={handleSubmit}>
            {status.type === "error" ? (
              <div className="rounded-md px-3 py-2 text-sm bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-300">
                {status.message}
              </div>
            ) : null}

            <label className="block space-y-1.5">
              <span className="text-sm font-medium text-zinc-800 dark:text-zinc-200">
                Title
              </span>
              <input
                type="text"
                value={form.title}
                onChange={(event) => setField("title", event.target.value)}
                required
                maxLength={160}
                className="w-full rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </label>

            <TextAreaField
              label="What happened?"
              value={form.description}
              onChange={(value) => setField("description", value)}
              rows={5}
              required
            />
            <TextAreaField
              label="Steps to reproduce"
              value={form.stepsToReproduce}
              onChange={(value) => setField("stepsToReproduce", value)}
              rows={4}
            />
            <TextAreaField
              label="Expected behavior"
              value={form.expectedBehavior}
              onChange={(value) => setField("expectedBehavior", value)}
              rows={3}
            />
            <TextAreaField
              label="Actual behavior"
              value={form.actualBehavior}
              onChange={(value) => setField("actualBehavior", value)}
              rows={3}
            />

            <div className="flex items-center justify-between gap-3 pt-2">
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                The current desktop main log is attached automatically.
              </p>
              <button
                type="submit"
                disabled={isSubmitting || !form.title.trim() || !form.description.trim()}
                className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-zinc-400 cursor-pointer"
              >
                {isSubmitting ? "Submitting..." : "Submit report"}
              </button>
            </div>
          </form>
        </div>
      </div>
      <Notification message="Bug report submitted" visible={toastVisible} />
    </>
  );
}
