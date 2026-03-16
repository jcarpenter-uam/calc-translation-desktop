import { LanguageSelect } from "./LanguageSelect";
import { ThemeToggle } from "./ThemeToggle";

type SettingsModalProps = {
  isOpen: boolean;
  language: string;
  onClose: () => void;
  onLanguageChange: (value: string) => void;
};

export function SettingsModal({
  isOpen,
  language,
  onClose,
  onLanguageChange,
}: SettingsModalProps) {
  if (!isOpen) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-ink/40 px-4"
      role="dialog"
      aria-modal="true"
      aria-label="Settings"
    >
      <div className="w-full max-w-md rounded-2xl border border-line bg-panel p-6 shadow-panel">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-ink">Settings</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-line px-2 py-1 text-xs font-semibold text-ink-muted transition hover:border-lime hover:text-lime focus:outline-none focus:ring-4 focus:ring-lime/20"
          >
            Close
          </button>
        </div>

        <div className="space-y-4">
          <ThemeToggle />
          <LanguageSelect value={language} onChange={onLanguageChange} />
        </div>
      </div>
    </div>
  );
}
