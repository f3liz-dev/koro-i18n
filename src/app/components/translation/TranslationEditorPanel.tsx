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
    <div style="
      order: 1;
      background: var(--color-white);
      border-radius: var(--radius);
      border: var(--border);
      flex-shrink: 0;
      display: flex;
      flex-direction: column;
      overflow: hidden;
      max-height: calc(100vh - 100px);
    ">
      <Show
        when={props.selectedKey && translation()}
        fallback={
          <div class="empty-state" style="flex: 1; display: flex; align-items: center; justify-center;">
            <div>
              <div class="icon" style="margin-bottom: 1rem;">
                <svg
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                  />
                </svg>
              </div>
              <p style="font-size: 1rem; color: var(--color-gray-600);">Select a translation to edit</p>
              <p class="lg:hidden" style="font-size: 0.875rem; color: var(--color-gray-400); margin-top: 0.5rem;">
                Tap menu to select
              </p>
            </div>
          </div>
        }
      >
        <div style="display: flex; flex-direction: column; height: 100%; overflow: hidden;">
          {/* Header */}
          <div style="
            padding: 1rem;
            border-bottom: var(--border);
            flex-shrink: 0;
            background: var(--color-gray-50);
          ">
            <code style="
              font-size: 0.813rem;
              font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
              color: var(--color-black);
              display: block;
              margin-bottom: 0.75rem;
              word-break: break-all;
              font-weight: 500;
            ">
              {translation()!.key}
            </code>
            <div style="display: flex; flex-direction: column; gap: 0.75rem;">
              <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 0.5rem;">
                <button
                  onClick={props.onToggleSuggestions}
                  class="btn"
                  style="font-size: 0.813rem;"
                >
                  {props.showSuggestions ? "Hide" : "Show"} Suggestions
                </button>
                <div style="display: flex; align-items: center; gap: 0.5rem;">
                  <button
                    onClick={props.onPrevious}
                    disabled={props.currentIndex === 1}
                    class="btn"
                    title="Previous (Alt+←)"
                  >
                    <svg
                      style="width: 1rem; height: 1rem;"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                        d="M15 19l-7-7 7-7"
                      />
                    </svg>
                  </button>
                  <span style="font-size: 0.875rem; color: var(--color-gray-600); padding: 0 0.5rem;">
                    {props.currentIndex} / {props.totalCount}
                  </span>
                  <button
                    onClick={props.onNext}
                    disabled={props.currentIndex === props.totalCount}
                    class="btn"
                    title="Next (Alt+→)"
                  >
                    <svg
                      style="width: 1rem; height: 1rem;"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                        d="M9 5l7 7-7 7"
                      />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Content */}
          <div style="
            padding: 1rem;
            display: flex;
            flex-direction: column;
            gap: 1rem;
            flex-shrink: 0;
            overflow-y: auto;
          ">
            {/* Source Text */}
            <div>
              <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 0.5rem;">
                <label class="label">
                  Source ({props.sourceLanguage.toUpperCase()})
                </label>
                <Show when={translation()?.gitBlame}>
                  <span class="badge">
                    GitHub
                  </span>
                </Show>
              </div>
              <div style="
                padding: 0.875rem;
                background: var(--color-gray-50);
                border-radius: var(--radius);
                border: var(--border);
                color: var(--color-black);
                font-size: 0.938rem;
                line-height: 1.5;
              ">
                {translation()!.sourceValue}
              </div>
              <div style="font-size: 0.75rem; color: var(--color-gray-500); margin-top: 0.25rem;">
                {translation()!.sourceValue.length} characters
              </div>
              
              {/* Git Blame Info */}
              <Show when={translation()?.gitBlame}>
                {(blame) => (
                  <div class="message info" style="margin-top: 0.5rem;">
                    <div style="font-weight: 500; margin-bottom: 0.25rem;">Git Info</div>
                    <div style="font-size: 0.75rem;">Commit: <code>{blame().commit.substring(0, 7)}</code></div>
                    <div style="font-size: 0.75rem;">Author: {blame().author}</div>
                    <div style="font-size: 0.75rem;">Date: {new Date(blame().date).toLocaleDateString()}</div>
                  </div>
                )}
              </Show>
            </div>

            {/* Translation Input */}
            <div>
              <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 0.5rem;">
                <label class="label">
                  Translation ({props.language.toUpperCase()})
                </label>
                <Show when={!translation()?.isValid}>
                  <span class="badge warning">
                    ⚠ Source changed
                  </span>
                </Show>
              </div>
              <textarea
                value={props.translationValue}
                onInput={(e) => props.onTranslationChange(e.currentTarget.value)}
                class="input"
                style={`
                  min-height: 120px;
                  resize: vertical;
                  font-size: 0.938rem;
                  line-height: 1.5;
                `}
                placeholder="Enter translation..."
              />
              <div style="display: flex; flex-direction: column; gap: 0.5rem; margin-top: 0.5rem;">
                <div style="display: flex; align-items: center; justify-content: space-between; gap: 0.75rem;">
                  <div style="font-size: 0.75rem; color: var(--color-gray-500);">
                    {props.translationValue.length} characters
                    <Show
                      when={
                        props.translationValue.length >
                        translation()!.sourceValue.length * 1.5
                      }
                    >
                      <span style="color: var(--color-peach); margin-left: 0.5rem;">⚠ Length warning</span>
                    </Show>
                  </div>
                  <button
                    onClick={props.onSave}
                    disabled={
                      props.isSaving ||
                      !props.translationValue.trim() ||
                      props.translationValue === translation()!.currentValue
                    }
                    class="btn primary"
                    style="padding: 0.75rem 1.5rem; font-size: 0.938rem;"
                  >
                    {props.isSaving ? 'Saving...' : 'Save'}
                  </button>
                </div>
                <div class="shortcuts lg:block" style="font-size: 0.75rem; color: var(--color-gray-400);">
                  💡 Shortcuts: Alt+← / Alt+→ to navigate, Ctrl+S to save
                </div>
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
          {/* Mobile-only sticky footer with larger touch targets for small screens */}
          <div class="lg:hidden" style="position: sticky; bottom: 0; padding: 0.75rem; background: linear-gradient(180deg, transparent, rgba(255,255,255,0.98)); z-index: 10;">
            <div style="display: flex; gap: 0.5rem; align-items: center; justify-content: space-between;">
              <div style="display:flex; gap:0.5rem; align-items:center;">
                <button
                  onClick={props.onPrevious}
                  disabled={props.currentIndex === 1}
                  class="btn"
                  aria-label="Previous"
                  style="padding: 0.75rem; min-width: 48px;"
                >
                  ←
                </button>
                <button
                  onClick={props.onNext}
                  disabled={props.currentIndex === props.totalCount}
                  class="btn"
                  aria-label="Next"
                  style="padding: 0.75rem; min-width: 48px;"
                >
                  →
                </button>
                <button
                  onClick={props.onToggleSuggestions}
                  class="btn"
                  aria-label="Toggle suggestions"
                  style="padding: 0.75rem;"
                >
                  {props.showSuggestions ? 'Hide' : 'Show'}
                </button>
              </div>

              <div style="display:flex; align-items:center; gap:0.5rem;">
                <div style="font-size: 0.875rem; color: var(--color-gray-600);">{props.translationValue.length} chars</div>
                <button
                  onClick={props.onSave}
                  disabled={
                    props.isSaving ||
                    !props.translationValue.trim() ||
                    props.translationValue === translation()!.currentValue
                  }
                  class="btn primary"
                  style="padding: 0.75rem 1rem; font-size: 1rem;"
                >
                  {props.isSaving ? 'Saving...' : 'Save'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </Show>
    </div>
  );
}
