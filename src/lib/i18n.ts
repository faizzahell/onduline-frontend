import i18n from 'i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import { initReactI18next } from 'react-i18next';

import { resources } from '../locales';

void i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    // English is the default language; Indonesian is opt-in through the
    // language switcher, which persists the choice in localStorage. The
    // browser locale is deliberately not part of the detection order so the
    // product reads the same for everyone until a user picks otherwise.
    fallbackLng: 'en',
    supportedLngs: ['en', 'id'],
    defaultNS: 'common',
    ns: ['common', 'auth', 'ocr', 'settings'],
    interpolation: { escapeValue: false },
    detection: {
      order: ['localStorage'],
      caches: ['localStorage'],
    },
  });

export default i18n;
