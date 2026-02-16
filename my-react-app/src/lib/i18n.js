import i18next from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

import authEn from '../features/auth/locales/en.json';
import authKu from '../features/auth/locales/ku.json';
import shopEn from '../features/shop/locales/en.json';
import shopKu from '../features/shop/locales/ku.json';
import warehouseEn from '../features/warehouse/locales/en.json';
import warehouseKu from '../features/warehouse/locales/ku.json';
import commonEn from '../features/common/locales/en.json';
import commonKu from '../features/common/locales/ku.json';

const resources = {
  en: {
    translation: {
      auth: authEn,
      shop: shopEn,
      warehouse: warehouseEn,
      common: commonEn
    }
  },
  ku: {
    translation: {
      auth: authKu,
      shop: shopKu,
      warehouse: warehouseKu,
      common: commonKu
    }
  }
};

i18next
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false,
    },
    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage'],
    }
  });

export default i18next;
