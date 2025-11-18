import { createContext, useContext, createSignal, createEffect, ParentComponent, JSX } from 'solid-js';
import enTranslations from '../locales/en/translations.json';
import jaTranslations from '../locales/ja/translations.json';

export type Language = 'en' | 'ja';

type Translations = typeof enTranslations;

const translations: Record<Language, Translations> = {
  en: enTranslations,
  ja: jaTranslations,
};

export const languageNames: Record<Language, string> = {
  en: 'English',
  ja: '日本語',
};

interface I18nContextType {
  language: () => Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

const I18nContext = createContext<I18nContextType>();

const LANGUAGE_STORAGE_KEY = 'koro-i18n-language';

export const I18nProvider: ParentComponent<{ children: JSX.Element }> = (props) => {
  // Initialize language from localStorage or browser preference
  const getInitialLanguage = (): Language => {
    // Check localStorage first
    const stored = localStorage.getItem(LANGUAGE_STORAGE_KEY) as Language | null;
    if (stored && (stored === 'en' || stored === 'ja')) {
      return stored;
    }
    
    // Check browser language
    const browserLang = navigator.language.toLowerCase();
    if (browserLang.startsWith('ja')) {
      return 'ja';
    }
    
    return 'en';
  };

  const [language, setLanguageInternal] = createSignal<Language>(getInitialLanguage());

  // Save to localStorage when language changes
  createEffect(() => {
    localStorage.setItem(LANGUAGE_STORAGE_KEY, language());
  });

  const setLanguage = (lang: Language) => {
    setLanguageInternal(lang);
  };

  const t = (key: string): string => {
    const keys = key.split('.');
    let value: any = translations[language()];
    
    for (const k of keys) {
      if (value && typeof value === 'object' && k in value) {
        value = value[k];
      } else {
        // Fallback to English if key not found
        value = translations.en;
        for (const fallbackKey of keys) {
          if (value && typeof value === 'object' && fallbackKey in value) {
            value = value[fallbackKey];
          } else {
            return key; // Return key if not found in fallback either
          }
        }
        break;
      }
    }
    
    return typeof value === 'string' ? value : key;
  };

  const value: I18nContextType = {
    language,
    setLanguage,
    t,
  };

  return (
    <I18nContext.Provider value={value}>
      {props.children}
    </I18nContext.Provider>
  );
};

export const useI18n = (): I18nContextType => {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error('useI18n must be used within I18nProvider');
  }
  return context;
};
