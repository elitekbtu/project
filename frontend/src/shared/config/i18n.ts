import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'

// Basic translation resources. Extend as needed.
const resources = {
  ru: {
    translation: {
      'common.loading': 'Загрузка...',
      'outfitBuilder.noOptions': 'Нет вариантов',
    },
  },
  en: {
    translation: {
      'common.loading': 'Loading...',
      'outfitBuilder.noOptions': 'No options',
    },
  },
} as const

// Initialize i18n once on app startup
void i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: 'ru', // default language
    fallbackLng: 'en',
    interpolation: { escapeValue: false },
  })

export default i18n 