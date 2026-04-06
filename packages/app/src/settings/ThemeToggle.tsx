import { useTheme, type ThemeMode } from "../contexts/ThemeContext";
import { useI18n } from "../contexts/UiI18nContext";
import { SettingHint } from "./SettingHint";

export function ThemeToggle() {
  const { theme, effectiveTheme, setThemeMode } = useTheme();
  const { t } = useI18n();
  const themeOptions: Array<{ value: ThemeMode; label: string }> = [
    { value: "light", label: t("theme.light") },
    { value: "dark", label: t("theme.dark") },
    { value: "system", label: t("theme.system") },
  ];

  return (
    <div className="rounded-xl border border-line bg-canvas p-3">
      <p className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-ink-muted">
        {t("theme.title")}
        <SettingHint text={t("theme.hint")} />
      </p>
      <div className="flex items-center gap-1">
        {themeOptions.map((option) => {
          const isActive = theme === option.value;

          return (
            <button
              key={option.value}
              type="button"
              onClick={() => setThemeMode(option.value)}
              className={`flex-1 rounded-md px-2 py-1.5 text-xs font-semibold transition ${
                isActive
                  ? "bg-accent text-accent-contrast"
                  : "text-ink-muted hover:text-lime"
              }`}
              title={
                option.value === "system"
                  ? t("theme.followingSystem", { theme: effectiveTheme })
                  : undefined
              }
            >
              {option.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
