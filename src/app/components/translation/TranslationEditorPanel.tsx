import { Show } from "solid-js";
import { TranslationSuggestionsPanel } from "./TranslationSuggestionsPanel";
import type { MergedTranslation, WebTranslation } from "../../utils/translationApi";

interface TranslationEditorPanelProps {
  selectedKey: string | null;
  translations: MergedTranslation[];
  language: string;
  sourceLanguage: string;
  translationValue: string;
  showSuggestions: boolean;
  suggestions: WebTranslation[];
  currentIndex: number;
  totalCount: number;
  isSaving: boolean;
  isLoading: boolean;
  onTranslationChange: (value: string) => void;
  onSave: () => void;
  onToggleSuggestions: () => void;
  onApproveSuggestion?: (id: string) => void;
  onRejectSuggestion?: (id: string) => void;
  onPrevious: () => void;
  onNext: () => void;
}

export function TranslationEditorPanel(props: TranslationEditorPanelProps) {
  const translation = () =>
    props.translations.find((t) => t.key === props.selectedKey);

  return (
    <div class="card" style={{
      display: 'flex',
      'flex-direction': 'column',
      overflow: 'hidden',
      'max-height': 'calc(100vh - 120px)'
    }}>
      <Show
        when={props.selectedKey && translation()}
        fallback={
          <div class="empty-state" style={{ flex: '1', display: 'flex', 'align-items': 'center', 'justify-content': 'center' }}>
            <div>
              <div class="icon" style={{ margin: '0 auto 1rem' }}>
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
              </div>
              <p style={{ color: 'var(--text-secondary)', 'text-align': 'center' }}>Select a translation to edit</p>
            </div>
          </div>
        }
      >
        <div style={{ display: 'flex', 'flex-direction': 'column', height: '100%', overflow: 'hidden' }}>
          {/* Header */}
          <div style={{
            padding: '1rem',
            'border-bottom': '1px solid var(--border)',
            'flex-shrink': '0',
            background: 'var(--surface)'
          }}>
            <code class="code-chip" style={{
              display: 'block',
              'margin-bottom': '0.75rem',
              'word-break': 'break-all'
            }}>
              {translation()!.key}
            </code>
            <div style={{ display: 'flex', 'align-items': 'center', 'justify-content': 'space-between', 'flex-wrap': 'wrap', gap: '0.5rem' }}>
              <button onClick={props.onToggleSuggestions} class="btn ghost" style={{ 'font-size': '0.875rem' }}>
                {props.showSuggestions ? "Hide" : "Show"} Suggestions
              </button>
              <div style={{ display: 'flex', 'align-items': 'center', gap: '0.5rem' }}>
                <button onClick={props.onPrevious} disabled={props.currentIndex === 1} class="btn ghost" title="Previous">
                  ←
                </button>
                <span style={{ 'font-size': '0.875rem', color: 'var(--text-secondary)' }}>
                  {props.currentIndex} / {props.totalCount}
                </span>
                <button onClick={props.onNext} disabled={props.currentIndex === props.totalCount} class="btn ghost" title="Next">
                  →
                </button>
              </div>
            </div>
          </div>

          {/* Content */}
          <div style={{
            padding: '1rem',
            display: 'flex',
            'flex-direction': 'column',
            gap: '1rem',
            'overflow-y': 'auto',
            flex: '1'
          }}>
            {/* Source Text */}
            <div>
              <div style={{ display: 'flex', 'align-items': 'center', 'justify-content': 'space-between', 'margin-bottom': '0.5rem' }}>
                <label class="label">Source ({props.sourceLanguage.toUpperCase()})</label>
                <Show when={translation()?.gitBlame}>
                  <span class="badge">GitHub</span>
                </Show>
              </div>
              <div class="panel" style={{ 'font-size': '0.9375rem', 'line-height': '1.5' }}>
                {translation()!.sourceValue}
              </div>
              <div style={{ 'font-size': '0.75rem', color: 'var(--text-muted)', 'margin-top': '0.25rem' }}>
                {translation()!.sourceValue.length} characters
              </div>
              
              <Show when={translation()?.gitBlame}>
                {(blame) => (
                  <div class="panel" style={{ 'margin-top': '0.5rem', 'font-size': '0.75rem' }}>
                    <div style={{ 'font-weight': '500', 'margin-bottom': '0.25rem' }}>Git Info</div>
                    <div>Commit: <code class="code-chip">{blame().commit.substring(0, 7)}</code></div>
                    <div>Author: {blame().author}</div>
                    <div>Date: {new Date(blame().date).toLocaleDateString()}</div>
                  </div>
                )}
              </Show>
            </div>

            {/* Translation Input */}
            <div>
              <div style={{ display: 'flex', 'align-items': 'center', 'justify-content': 'space-between', 'margin-bottom': '0.5rem' }}>
                <label class="label">Translation ({props.language.toUpperCase()})</label>
                <Show when={!translation()?.isValid}>
                  <span class="badge warning">⚠ Source changed</span>
                </Show>
              </div>
              <textarea
                value={props.translationValue}
                onInput={(e) => props.onTranslationChange(e.currentTarget.value)}
                class="input"
                style={{
                  'min-height': '120px',
                  resize: 'vertical',
                  'font-size': '0.9375rem',
                  'line-height': '1.5'
                }}
                placeholder="Enter translation..."
              />
              <div style={{ display: 'flex', 'align-items': 'center', 'justify-content': 'space-between', gap: '0.75rem', 'margin-top': '0.5rem' }}>
                <div style={{ 'font-size': '0.75rem', color: 'var(--text-muted)' }}>
                  {props.translationValue.length} characters
                  <Show when={props.translationValue.length > translation()!.sourceValue.length * 1.5}>
                    <span style={{ color: 'var(--warning)', 'margin-left': '0.5rem' }}>⚠ Length warning</span>
                  </Show>
                </div>
                <button
                  onClick={props.onSave}
                  disabled={props.isSaving || !props.translationValue.trim() || props.translationValue === translation()!.currentValue}
                  class="btn primary"
                >
                  {props.isSaving ? 'Saving...' : 'Save'}
                </button>
              </div>
            </div>
          </div>

          {/* Suggestions Panel */}
          <TranslationSuggestionsPanel
            show={props.showSuggestions}
            suggestions={props.suggestions}
            isLoading={props.isLoading}
            onApprove={props.onApproveSuggestion}
            onReject={props.onRejectSuggestion}
          />
        </div>
      </Show>
    </div>
  );
}
