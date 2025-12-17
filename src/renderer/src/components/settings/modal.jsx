import React, { useEffect } from "react";
import { X } from "@phosphor-icons/react/dist/csr/X";
import Theme from "./theme.jsx";
import Language from "./language.jsx";
import PinToggle from "./pinned-toggle.jsx";
import { useSettings } from "../../context/settings.jsx";
import BetaToggle from "./beta-toggle.jsx";
import DisplayMode from "./display-mode.jsx";

const SettingsRow = ({ label, children }) => (
  <div className="flex items-center justify-between">
    <span className="text-sm font-medium text-zinc-800 dark:text-zinc-200">
      {label}
    </span>
    <div className="app-region-no-drag">{children}</div>
  </div>
);

export default function SettingsModal({ isOpen, onClose }) {
  const { appVersion } = useSettings();

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    if (isOpen) {
      window.addEventListener("keydown", handleKeyDown);
    }

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) {
    return null;
  }

  const handlePanelClick = (e) => {
    e.stopPropagation();
  };

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4 transition-opacity"
      onClick={onClose}
      aria-modal="true"
      role="dialog"
    >
      <div
        className="w-full max-w-md overflow-hidden rounded-lg bg-white dark:bg-zinc-900 shadow-2xl app-region-drag"
        onClick={handlePanelClick}
      >
        <header className="flex items-center justify-between border-b border-zinc-200/80 dark:border-zinc-700/80 px-4 py-2">
          <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
            Settings
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-full text-zinc-600 dark:text-zinc-400 transition-colors app-region-no-drag hover:bg-red-500/90 hover:text-white focus:outline-none focus:ring-2 focus:ring-red-500"
            aria-label="Close settings"
          >
            <X className="w-5 h-5" />
          </button>
        </header>

        <main className="px-6 py-3 space-y-2">
          <SettingsRow label="Appearance">
            <Theme />
          </SettingsRow>
          <div className="border-b border-zinc-200/80 dark:border-zinc-700/80 !my-2"></div>
          <SettingsRow label="Pin to Top">
            <PinToggle />
          </SettingsRow>
          <div className="border-b border-zinc-200/80 dark:border-zinc-700/80 !my-2"></div>
          <SettingsRow label="Language">
            <Language />
          </SettingsRow>
          <div className="border-b border-zinc-200/80 dark:border-zinc-700/80 !my-2"></div>
          <SettingsRow label="Display Mode">
            <DisplayMode />
          </SettingsRow>
        </main>
        <footer className="px-6 py-3 flex justify-between items-center border-t border-zinc-200/80 dark:border-zinc-700/80">
          <span className="text-xs text-zinc-500 dark:text-zinc-400">
            Version {appVersion}
          </span>
          <div className="app-region-no-drag flex items-center gap-2">
            <span className="text-xs text-zinc-500 dark:text-zinc-4out">
              Beta Channel
            </span>
            <BetaToggle />
          </div>
        </footer>
      </div>
    </div>
  );
}
