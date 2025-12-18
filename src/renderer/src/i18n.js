import i18n from "i18next";
import { initReactI18next } from "react-i18next";

import en from "./locales/translations/en.json";
import es from "./locales/translations/es.json";
import zh from "./locales/translations/zh.json";
import id from "./locales/translations/id.json";

i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    es: { translation: es },
    zh: { translation: zh },
    id: { translation: id },
  },

  lng: "en",
  fallbackLng: "en",

  interpolation: {
    escapeValue: false,
  },
});

export default i18n;
