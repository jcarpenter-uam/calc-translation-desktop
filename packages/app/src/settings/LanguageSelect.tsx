import { SettingHint } from "./SettingHint";

export const LANGUAGE_STORAGE_KEY = "calc-translation-language";

const languageOptions = [
  { value: "en", label: "English" },
  { value: "es", label: "Spanish" },
  { value: "fr", label: "French" },
  { value: "de", label: "German" },
  { value: "ja", label: "Japanese" },
];

export function readInitialLanguage() {
  const browser = globalThis as any;
  const storedLanguage = browser?.localStorage?.getItem?.(LANGUAGE_STORAGE_KEY);
  const validLanguage = languageOptions.some(
    (option) => option.value === storedLanguage,
  );

  return validLanguage ? storedLanguage : "en";
}

type LanguageSelectProps = {
  value: string;
  onChange: (value: string) => void;
};

export function LanguageSelect({ value, onChange }: LanguageSelectProps) {
  return (
    <div className="rounded-xl border border-line bg-canvas p-3">
      <div className="mb-2 flex items-center gap-2">
        <label
          htmlFor="language-select"
          className="text-xs font-semibold uppercase tracking-[0.12em] text-ink-muted"
        >
          Language
        </label>
        <SettingHint text="Sets your preferred language for your account." />
      </div>
      <select
        id="language-select"
        value={value}
        onChange={(event: any) => onChange(String(event.target.value))}
        className="w-full rounded-lg border border-line bg-panel px-3 py-2 text-sm text-ink focus:border-lime focus:outline-none focus:ring-4 focus:ring-lime/20"
      >
        {languageOptions.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}
