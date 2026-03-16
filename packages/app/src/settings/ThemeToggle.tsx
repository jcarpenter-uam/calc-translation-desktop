import { useTheme, type ThemeMode } from "../theme/ThemeContext";
import { SettingHint } from "./SettingHint";

const themeOptions: Array<{ value: ThemeMode; label: string }> = [
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
  { value: "system", label: "System" },
];

export function ThemeToggle() {
  const { theme, effectiveTheme, setThemeMode } = useTheme();

  return (
    <div className="rounded-xl border border-line bg-canvas p-3">
      <p className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-ink-muted">
        Theme
        <SettingHint text="Choose how the app looks: light, dark, or follow your system setting." />
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
                  ? `Following system (${effectiveTheme})`
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
