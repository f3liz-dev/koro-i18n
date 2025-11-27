import { Show } from "solid-js";
import { TranslationSuggestionsPanel } from "./TranslationSuggestionsPanel";
import type { UiMergedTranslation as MergedTranslation, WebTranslation } from "../../utils/translationApi";

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
      'max-height': 'calc(100vh - 140px)'
    }}>
      <Show
        when={props.selectedKey && translation()}
        fallback={
          <div style={{ 
            flex: '1', 
            display: 'flex', 
            'align-items': 'center', 
            'justify-content': 'center',
            padding: '3rem'
          }}>
            <div style={{ 'text-align': 'center' }}>
              <div style={{
                width: '4rem',
                height: '4rem',
                margin: '0 auto 1.25rem',
                display: 'flex',
                'align-items': 'center',
                'justify-content': 'center',
                background: 'var(--surface)',
                'border-radius': '50%',
                border: '1px solid var(--border-light)'
              }}>
                <svg width="24" height="24" fill="none" stroke="var(--text-muted)" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
              </div>
              <p style={{ color: 'var(--text-secondary)', 'font-size': '0.9375rem' }}>
                Select a translation key to edit
              </p>
            </div>
          </div>
        }
      >
        <div style={{ display: 'flex', 'flex-direction': 'column', height: '100%', overflow: 'hidden' }}>
          {/* Header with key info */}
          <div style={{
            padding: '1rem 1.25rem',
            'border-bottom': '1px solid var(--border-light)',
            'flex-shrink': '0',
            background: 'var(--surface)'
          }}>
            <div style={{ 
              display: 'flex', 
              'align-items': 'center', 
              'justify-content': 'space-between',
              'flex-wrap': 'wrap',
              gap: '0.75rem',
              'margin-bottom': '0.75rem'
            }}>
              <code class="code-chip" style={{
                'font-size': '0.875rem',
                'word-break': 'break-all',
                'font-weight': '500'
              }}>
                {translation()!.key}
              </code>
              <Show when={!translation()?.isValid}>
                <span class="badge warning">
                  <svg width="12" height="12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  Outdated
                </span>
              </Show>
            </div>
            <div style={{ display: 'flex', 'align-items': 'center', 'justify-content': 'space-between' }}>
              <button onClick={props.onToggleSuggestions} class="btn ghost sm">
                {props.showSuggestions ? "Hide" : "Show"} Suggestions
              </button>
              <div style={{ display: 'flex', 'align-items': 'center', gap: '0.5rem' }}>
                <button 
                  onClick={props.onPrevious} 
                  disabled={props.currentIndex === 1} 
                  class="btn ghost sm" 
                  title="Previous"
                  style={{ padding: '0.375rem 0.625rem' }}
                >
                  <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
                <span style={{ 
                  'font-size': '0.8125rem', 
                  color: 'var(--text-secondary)',
                  'min-width': '4rem',
                  'text-align': 'center'
                }}>
                  {props.currentIndex} / {props.totalCount}
                </span>
                <button 
                  onClick={props.onNext} 
                  disabled={props.currentIndex === props.totalCount} 
                  class="btn ghost sm" 
                  title="Next"
                  style={{ padding: '0.375rem 0.625rem' }}
                >
                  <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </div>
            </div>
          </div>

          {/* Content */}
          <div style={{
            padding: '1.25rem',
            display: 'flex',
            'flex-direction': 'column',
            gap: '1.25rem',
            'overflow-y': 'auto',
            flex: '1'
          }}>
            {/* Source Text */}
            <div>
              <div style={{ 
                display: 'flex', 
                'align-items': 'center', 
                'justify-content': 'space-between', 
                'margin-bottom': '0.625rem' 
              }}>
                <label class="label" style={{ margin: '0' }}>
                  Source ({props.sourceLanguage.toUpperCase()})
                </label>
                <Show when={translation()?.gitBlame}>
                  <span class="badge neutral">
                    <svg width="12" height="12" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                    </svg>
                    GitHub
                  </span>
                </Show>
              </div>
              <div class="panel" style={{ 
                'font-size': '0.9375rem', 
                'line-height': '1.6',
                background: 'var(--surface)'
              }}>
                {translation()!.sourceValue}
              </div>
              <div style={{ 
                'font-size': '0.75rem', 
                color: 'var(--text-muted)', 
                'margin-top': '0.375rem' 
              }}>
                {translation()!.sourceValue.length} characters
              </div>

              <Show when={translation()?.gitBlame}>
                {(blame) => (
                  <div class="panel" style={{ 
                    'margin-top': '0.75rem', 
                    'font-size': '0.8125rem',
                    background: 'var(--surface)',
                    padding: '0.75rem'
                  }}>
                    <div style={{ 
                      display: 'flex', 
                      'align-items': 'center', 
                      gap: '0.5rem',
                      'margin-bottom': '0.5rem',
                      'font-weight': '600'
                    }}>
                      <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      Git Info
                    </div>
                    <div style={{ color: 'var(--text-secondary)', 'font-size': '0.75rem' }}>
                      <div>Commit: <code class="code-chip">{blame().commit.substring(0, 7)}</code></div>
                      <div>Author: {blame().author}</div>
                      <div>Date: {new Date(blame().date).toLocaleDateString()}</div>
                    </div>
                  </div>
                )}
              </Show>
            </div>

            {/* Translation Input */}
            <div>
              <div style={{ 
                display: 'flex', 
                'align-items': 'center', 
                'justify-content': 'space-between', 
                'margin-bottom': '0.625rem' 
              }}>
                <label class="label" style={{ margin: '0' }}>
                  Translation ({props.language.toUpperCase()})
                </label>
              </div>
              <textarea
                value={props.translationValue}
                onInput={(e) => props.onTranslationChange(e.currentTarget.value)}
                class="input"
                style={{
                  'min-height': '140px',
                  resize: 'vertical',
                  'font-size': '0.9375rem',
                  'line-height': '1.6'
                }}
                placeholder="Enter your translation..."
              />
              <div style={{ 
                display: 'flex', 
                'align-items': 'center', 
                'justify-content': 'space-between', 
                gap: '0.75rem', 
                'margin-top': '0.75rem' 
              }}>
                <div style={{ 'font-size': '0.75rem', color: 'var(--text-muted)' }}>
                  {props.translationValue.length} characters
                  <Show when={props.translationValue.length > translation()!.sourceValue.length * 1.5}>
                    <span class="badge warning" style={{ 'margin-left': '0.5rem', 'font-size': '0.6875rem' }}>
                      Length warning
                    </span>
                  </Show>
                </div>
                <button
                  onClick={props.onSave}
                  disabled={props.isSaving || !props.translationValue.trim() || props.translationValue === translation()!.currentValue}
                  class="btn primary"
                >
                  {props.isSaving ? (
                    <>
                      <span class="animate-spin" style={{ 
                        width: '0.875rem', 
                        height: '0.875rem', 
                        border: '2px solid rgba(255,255,255,0.3)',
                        'border-top-color': 'white',
                        'border-radius': '50%'
                      }} />
                      Saving...
                    </>
                  ) : (
                    'Save Translation'
                  )}
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
