import i18next from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

import warehouseEn from '../features/warehouse/locales/en.json';
import warehouseKu from '../features/warehouse/locales/ku.json';

const commonEn = {
  search: "Search...",
  save: "Save",
  cancel: "Cancel",
  delete: "Delete",
  edit: "Edit",
  add: "Add",
  back: "Back",
  loading: "Loading...",
  error: "An error occurred",
  success: "Success",
  confirm: "Confirm",
  confirmDelete: "Delete this item from inventory?",
  noData: "No data available",
  actions: "Actions",
  date: "Date",
  name: "Name",
  status: "Status",
  amount: "Amount",
  type: "Type",
  description: "Description",
  branches: "Branches",
  inventory: "Inventory",
  dashboard: "Dashboard",
  settings: "Settings",
  allEmployees: "All Employees",
  by: "By",
  adminRole: "Warehouse Admin",
  language: "Language",
  newSale: "New Sale",
  saleRecorded: "Sale of {{amount}} recorded"
};

const commonKu = {
  search: "لێگەڕیان...",
  save: "پاراستن",
  cancel: "وەشاندن",
  delete: "ژێبرن",
  edit: "دەستکاری",
  add: "زێدەکرن",
  back: "زڤڕین",
  loading: "کاردکەت...",
  error: "خەلەتیەک چێبوو",
  success: "ب سەرکەفتی",
  confirm: "پشتڕاستکرن",
  confirmDelete: "Delete this item from inventory?",
  noData: "چ پێزانین نینن",
  actions: "کار",
  date: "رێکەفت",
  name: "ناڤ",
  status: "بارودۆخ",
  amount: "بڕ",
  type: "جور",
  description: "وەسف",
  branches: "تاخ",
  inventory: "کۆگاشەکان",
  dashboard: "تەختەیا چاڤدێریێ",
  settings: "رێکخستن",
  allEmployees: "هەموو کارمەند",
  by: "ژ لایێ",
  adminRole: "رێڤەبەرێ کۆگەهێ",
  language: "زمان",
  newSale: "فرۆشتنا نووی",
  saleRecorded: "فرۆشتنا ب کۆژمێ {{amount}} هاتە تۆمارکرن"
};

const resources = {
  en: {
    translation: {
      ...warehouseEn,
      common: { ...commonEn, ...warehouseEn.common }
    }
  },
  ku: {
    translation: {
      ...warehouseKu,
      common: { ...commonKu, ...warehouseKu.common }
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
