import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from './locales/en.json';

export const languages = [
  { code: 'en', name: 'English', nativeName: 'English' },
] as const;

export type LanguageCode = (typeof languages)[number]['code'];

i18n
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
    },
    fallbackLng: 'en',
    lng: 'en',
    interpolation: {
      escapeValue: false,
    },
  });

export default i18n;
