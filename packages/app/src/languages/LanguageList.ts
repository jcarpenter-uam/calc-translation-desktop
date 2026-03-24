export const LANGUAGE_OPTIONS = [
  { value: "af", label: "Afrikaans", flag: "za" },
  { value: "sq", label: "Albanian", flag: "al" },
  { value: "ar", label: "Arabic", flag: "sa" },
  { value: "az", label: "Azerbaijani", flag: "az" },
  {
    value: "eu",
    label: "Basque",
    flag: "https://upload.wikimedia.org/wikipedia/commons/2/2d/Flag_of_the_Basque_Country.svg",
  },
  { value: "be", label: "Belarusian", flag: "by" },
  { value: "bn", label: "Bengali", flag: "bd" },
  { value: "bs", label: "Bosnian", flag: "ba" },
  { value: "bg", label: "Bulgarian", flag: "bg" },
  {
    value: "ca",
    label: "Catalan",
    flag: "https://upload.wikimedia.org/wikipedia/commons/c/ce/Flag_of_Catalonia.svg",
  },
  { value: "zh", label: "Chinese", flag: "cn" },
  { value: "hr", label: "Croatian", flag: "hr" },
  { value: "cs", label: "Czech", flag: "cz" },
  { value: "da", label: "Danish", flag: "dk" },
  { value: "nl", label: "Dutch", flag: "nl" },
  { value: "en", label: "English", flag: "gb" },
  { value: "et", label: "Estonian", flag: "ee" },
  { value: "fi", label: "Finnish", flag: "fi" },
  { value: "fr", label: "French", flag: "fr" },
  {
    value: "gl",
    label: "Galician",
    flag: "https://upload.wikimedia.org/wikipedia/commons/6/64/Flag_of_Galicia.svg",
  },
  { value: "de", label: "German", flag: "de" },
  { value: "el", label: "Greek", flag: "gr" },
  { value: "gu", label: "Gujarati", flag: "in" },
  { value: "he", label: "Hebrew", flag: "il" },
  { value: "hi", label: "Hindi", flag: "in" },
  { value: "hu", label: "Hungarian", flag: "hu" },
  { value: "id", label: "Indonesian", flag: "id" },
  { value: "it", label: "Italian", flag: "it" },
  { value: "ja", label: "Japanese", flag: "jp" },
  { value: "kn", label: "Kannada", flag: "in" },
  { value: "kk", label: "Kazakh", flag: "kz" },
  { value: "ko", label: "Korean", flag: "kr" },
  { value: "lv", label: "Latvian", flag: "lv" },
  { value: "lt", label: "Lithuanian", flag: "lt" },
  { value: "mk", label: "Macedonian", flag: "mk" },
  { value: "ms", label: "Malay", flag: "my" },
  { value: "ml", label: "Malayalam", flag: "in" },
  { value: "mr", label: "Marathi", flag: "in" },
  { value: "no", label: "Norwegian", flag: "no" },
  { value: "fa", label: "Persian", flag: "ir" },
  { value: "pl", label: "Polish", flag: "pl" },
  { value: "pt", label: "Portuguese", flag: "pt" },
  { value: "pa", label: "Punjabi", flag: "in" },
  { value: "ro", label: "Romanian", flag: "ro" },
  { value: "ru", label: "Russian", flag: "ru" },
  { value: "sr", label: "Serbian", flag: "rs" },
  { value: "sk", label: "Slovak", flag: "sk" },
  { value: "sl", label: "Slovenian", flag: "si" },
  { value: "es", label: "Spanish", flag: "es" },
  { value: "sw", label: "Swahili", flag: "tz" },
  { value: "sv", label: "Swedish", flag: "se" },
  { value: "tl", label: "Tagalog", flag: "ph" },
  { value: "ta", label: "Tamil", flag: "in" },
  { value: "te", label: "Telugu", flag: "in" },
  { value: "th", label: "Thai", flag: "th" },
  { value: "tr", label: "Turkish", flag: "tr" },
  { value: "uk", label: "Ukrainian", flag: "ua" },
  { value: "ur", label: "Urdu", flag: "pk" },
  { value: "vi", label: "Vietnamese", flag: "vn" },
  { value: "cy", label: "Welsh", flag: "gb-wls" },
] as const;

export type LanguageCode = (typeof LANGUAGE_OPTIONS)[number]["value"];
export type LanguageOption = (typeof LANGUAGE_OPTIONS)[number];

export const DEFAULT_LANGUAGE_OPTION: LanguageOption = LANGUAGE_OPTIONS[0];
export const DEFAULT_LANGUAGE_CODE = DEFAULT_LANGUAGE_OPTION.value;

export const LanguageList = LANGUAGE_OPTIONS;

/**
 * Returns true when the provided value matches a supported language code.
 */
export function isLanguageCode(value: string): value is LanguageCode {
  return LANGUAGE_OPTIONS.some((option) => option.value === value);
}

/**
 * Resolves a language code to its full option object.
 */
export function getLanguageOption(code: string | null | undefined) {
  return (
    LANGUAGE_OPTIONS.find((option) => option.value === code) ||
    DEFAULT_LANGUAGE_OPTION
  );
}

/**
 * Resolves a language code to its display label.
 */
export function getLanguageLabel(code: string | null | undefined) {
  return getLanguageOption(code).label;
}

/**
 * Resolves a language code to a flag image URL.
 */
export function getLanguageFlagSrc(code: string | null | undefined) {
  const flag = getLanguageOption(code).flag;

  return flag.startsWith("http") ? flag : `https://flagcdn.com/${flag}.svg`;
}
