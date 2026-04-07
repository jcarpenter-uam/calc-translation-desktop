import { LanguageSelect } from "./LanguageSelect";
import { ThemeToggle } from "./ThemeToggle";
import { useI18n } from "../contexts/UiI18nContext";
import { getLanguageLabel } from "../languages/LanguageList";
import { dispatchTourUiEvent, TOUR_RESTART_DASHBOARD_EVENT } from "../tour/events";

type SettingsModalProps = {
  isOpen: boolean;
  language: string;
  isUiTranslationEnabled: boolean;
  canTranslateUi: boolean;
  onClose: () => void;
  onLanguageChange: (value: string) => void;
  onUiTranslationChange: (enabled: boolean) => void;
};

export function SettingsModal({
  isOpen,
  language,
  isUiTranslationEnabled,
  canTranslateUi,
  onClose,
  onLanguageChange,
  onUiTranslationChange,
}: SettingsModalProps) {
  const { locale, t } = useI18n();
  if (!isOpen) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-ink/40 px-4"
      role="dialog"
      aria-modal="true"
      aria-label={t("settings.title")}
    >
      <div className="w-full max-w-md rounded-2xl border border-line bg-panel p-6 shadow-panel">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-ink">{t("settings.title")}</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-line px-2 py-1 text-xs font-semibold text-ink-muted transition hover:border-lime hover:text-lime focus:outline-none focus:ring-4 focus:ring-lime/20"
          >
            {t("common.close")}
          </button>
        </div>

        <div className="space-y-4">
          <ThemeToggle />
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-ink-muted">
              {t("settings.languageSection")}
            </p>
            <LanguageSelect value={language} onChange={onLanguageChange} />
            <div className="rounded-xl border border-line bg-canvas p-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-ink-muted">
                    {t("settings.translateUi")}
                  </p>
                  <p className="mt-1 text-xs text-ink-muted">
                    {t("settings.translateUiHint")}
                  </p>
                </div>
                <button
                  id="tour-ui-translation-toggle"
                  type="button"
                  role="switch"
                  aria-checked={isUiTranslationEnabled}
                  onClick={() => {
                    if (canTranslateUi) {
                      onUiTranslationChange(!isUiTranslationEnabled);
                    }
                  }}
                  disabled={!canTranslateUi}
                  className={`relative h-7 w-12 rounded-full transition ${isUiTranslationEnabled && canTranslateUi ? "bg-lime" : "bg-line"} ${canTranslateUi ? "" : "cursor-not-allowed opacity-60"}`}
                >
                  <span
                    className={`absolute top-1 h-5 w-5 rounded-full bg-white transition ${isUiTranslationEnabled && canTranslateUi ? "left-6" : "left-1"}`}
                  />
                </button>
              </div>
              <p className="mt-3 text-xs text-ink-muted">
                {canTranslateUi
                  ? isUiTranslationEnabled
                    ? t("settings.translateUiEnabled", {
                        language: getLanguageLabel(language, locale),
                      })
                    : t("settings.translateUiDisabled")
                  : t("settings.translateUiUnavailable", {
                      language: getLanguageLabel(language, locale),
                    })}
              </p>
            </div>
            <div className="rounded-xl border border-line bg-canvas p-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-ink-muted">
                    {t("settings.productTour")}
                  </p>
                  <p className="mt-1 text-xs text-ink-muted">
                    {t("settings.productTourHint")}
                  </p>
                </div>
                <button
                  id="tour-restart-dashboard"
                  type="button"
                  onClick={() => {
                    dispatchTourUiEvent(TOUR_RESTART_DASHBOARD_EVENT);
                    onClose();
                  }}
                  className="rounded-lg border border-line bg-panel px-3 py-2 text-xs font-semibold text-ink transition hover:border-lime hover:text-lime focus:outline-none focus:ring-4 focus:ring-lime/20"
                >
                  {t("settings.restartTour")}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
