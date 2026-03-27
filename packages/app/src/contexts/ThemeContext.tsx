import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export type ThemeMode = "light" | "dark" | "system";

type ThemeContextValue = {
  theme: ThemeMode;
  effectiveTheme: "light" | "dark";
  setThemeMode: (theme: ThemeMode) => void;
};

const STORAGE_KEY = "calc-translation-theme";
const ThemeContext = createContext<ThemeContextValue | null>(null);

/**
 * Reads the persisted theme preference, falling back to system mode.
 */
function readInitialTheme(): ThemeMode {
  const browser = globalThis as any;
  const storedTheme = browser?.localStorage?.getItem?.(STORAGE_KEY);

  if (storedTheme === "light" || storedTheme === "dark" || storedTheme === "system") {
    return storedTheme;
  }

  return "system";
}

/**
 * Resolves the browser's current system color-scheme preference.
 */
function readSystemTheme(): "light" | "dark" {
  const browser = globalThis as any;

  const prefersDark = Boolean(
    browser?.matchMedia?.("(prefers-color-scheme: dark)")?.matches,
  );

  return prefersDark ? "dark" : "light";
}

/**
 * Persists the selected theme and mirrors it onto the root document element.
 */
function applyTheme(theme: ThemeMode) {
  const browser = globalThis as any;

  if (theme === "system") {
    browser?.document?.documentElement?.removeAttribute?.("data-theme");
  } else {
    browser?.document?.documentElement?.setAttribute?.("data-theme", theme);
  }

  browser?.localStorage?.setItem?.(STORAGE_KEY, theme);
}

type ThemeProviderProps = {
  children: ReactNode;
};

/**
 * Provides persisted theme state plus the currently effective light/dark mode.
 */
export function ThemeProvider({ children }: ThemeProviderProps) {
  const [theme, setTheme] = useState<ThemeMode>(readInitialTheme);
  const [systemTheme, setSystemTheme] = useState<"light" | "dark">(
    readSystemTheme,
  );

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  useEffect(() => {
    const browser = globalThis as any;
    const media = browser?.matchMedia?.("(prefers-color-scheme: dark)");

    if (!media?.addEventListener) {
      return;
    }

    // Listen only for system-theme changes; explicit light/dark selections are handled locally.
    const onChange = (event: any) => {
      setSystemTheme(event.matches ? "dark" : "light");
    };

    media.addEventListener("change", onChange);
    return () => {
      media.removeEventListener("change", onChange);
    };
  }, []);

  const effectiveTheme = theme === "system" ? systemTheme : theme;

  const value = useMemo(
    () => ({
      theme,
      effectiveTheme,
      setThemeMode: setTheme,
    }),
    [theme, effectiveTheme],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const value = useContext(ThemeContext);
  if (!value) {
    throw new Error("useTheme must be used inside ThemeProvider");
  }

  return value;
}
