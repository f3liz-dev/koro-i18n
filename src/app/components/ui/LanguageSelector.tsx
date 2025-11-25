import { For } from 'solid-js';
import { useI18n, languageNames, type Language } from '../../utils/i18n';

export function LanguageSelector() {
  const { language, setLanguage } = useI18n();

  const languages: Language[] = ['en', 'ja'];

  return (
    <div style={{ position: 'relative', display: 'inline-block' }}>
      <select
        value={language()}
        onChange={(e) => setLanguage(e.currentTarget.value as Language)}
        class="input"
        style={{
          appearance: 'none',
          padding: '0.5rem 2rem 0.5rem 0.75rem',
          'font-size': '0.875rem',
          'font-weight': '500',
          cursor: 'pointer',
          'min-width': '7rem'
        }}
        aria-label="Select language"
      >
        <For each={languages}>
          {(lang) => (
            <option value={lang}>{languageNames[lang]}</option>
          )}
        </For>
      </select>
      <div style={{
        position: 'absolute',
        right: '0.625rem',
        top: '50%',
        transform: 'translateY(-50%)',
        'pointer-events': 'none'
      }}>
        <svg style={{ width: '1rem', height: '1rem', color: 'var(--text-secondary)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
        </svg>
      </div>
    </div>
  );
}

export default LanguageSelector;
