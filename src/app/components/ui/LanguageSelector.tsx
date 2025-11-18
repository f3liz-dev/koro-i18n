import { For } from 'solid-js';
import { useI18n, languageNames, type Language } from '../../utils/i18n';

export function LanguageSelector() {
  const { language, setLanguage } = useI18n();

  const languages: Language[] = ['en', 'ja'];

  return (
    <div class="relative inline-block">
      <select
        value={language()}
        onChange={(e) => setLanguage(e.currentTarget.value as Language)}
        class="kawaii-select appearance-none px-3 py-2 pr-8 text-sm font-medium bg-white border-2 border-gray-200 rounded-lg hover:border-primary-300 focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-100 transition-all cursor-pointer"
        aria-label="Select language"
      >
        <For each={languages}>
          {(lang) => (
            <option value={lang}>{languageNames[lang]}</option>
          )}
        </For>
      </select>
      <div class="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none">
        <svg class="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
        </svg>
      </div>
    </div>
  );
}

export default LanguageSelector;
