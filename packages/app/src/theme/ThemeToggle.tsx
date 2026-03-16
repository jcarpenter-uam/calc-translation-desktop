import { useTheme } from "./ThemeContext";

export function ThemeToggle() {
  const { theme, effectiveTheme, setThemeMode } = useTheme();

  const options: Array<{ value: "light" | "dark" | "system"; label: string }> = [
    { value: "light", label: "Light" },
    { value: "dark", label: "Dark" },
    { value: "system", label: "System" },
  ];

  return (
    <div className="flex items-center gap-1 rounded-full border border-line bg-panel p-1 text-xs shadow-panel">
      {options.map((option) => {
        const isActive = theme === option.value;

        return (
          <button
            key={option.value}
            type="button"
            onClick={() => setThemeMode(option.value)}
            className={`rounded-full px-3 py-1 font-semibold transition ${
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
  );
}
