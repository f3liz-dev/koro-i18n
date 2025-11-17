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
    <div class="order-1 lg:order-2 bg-white rounded-lg shadow flex-shrink-0 flex flex-col overflow-hidden max-h-[calc(100vh-100px)]">
      <Show
        when={props.selectedKey && translation()}
        fallback={
          <div class="p-8 text-center text-gray-500 flex-1 flex items-center justify-center">
            <div>
              <svg
                class="w-12 h-12 lg:w-16 lg:h-16 mx-auto mb-2 lg:mb-4 text-gray-300"
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
              <p class="text-base lg:text-lg">Select a translation string to edit</p>
              <p class="text-xs lg:text-sm text-gray-400 mt-1 lg:mt-2 lg:hidden">
                Tap the menu to select
              </p>
            </div>
          </div>
        }
      >
        <div class="flex flex-col h-full overflow-hidden">
          {/* Header */}
          <div class="p-2 lg:p-4 border-b flex-shrink-0">
            <code class="text-xs lg:text-sm font-mono text-gray-700 block mb-2 lg:mb-3 break-all">
              {translation()!.key}
            </code>
            <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 lg:gap-3">
              <button
                onClick={props.onToggleSuggestions}
                class="text-xs lg:text-sm text-blue-600 hover:text-blue-800 active:text-blue-900 transition"
              >
                {props.showSuggestions ? "Hide" : "Show"} Suggestions
              </button>
              <div class="flex items-center gap-2">
                <button
                  onClick={props.onPrevious}
                  disabled={props.currentIndex === 1}
                  class="px-4 py-2.5 lg:py-2 border rounded hover:bg-gray-50 active:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed flex items-center gap-2 transition"
                  title="Previous (Alt+←)"
                >
                  <svg
                    class="w-5 h-5 lg:w-4 lg:h-4"
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
                  <span class="hidden sm:inline text-sm">Prev</span>
                </button>
                <span class="text-sm text-gray-600 px-2">
                  {props.currentIndex} / {props.totalCount}
                </span>
                <button
                  onClick={props.onNext}
                  disabled={props.currentIndex === props.totalCount}
                  class="px-4 py-2.5 lg:py-2 border rounded hover:bg-gray-50 active:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed flex items-center gap-2 transition"
                  title="Next (Alt+→)"
                >
                  <span class="hidden sm:inline text-sm">Next</span>
                  <svg
                    class="w-5 h-5 lg:w-4 lg:h-4"
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

          {/* Content */}
          <div class="p-2 lg:p-4 space-y-2 lg:space-y-4 flex-shrink-0 overflow-y-auto">
            {/* Source Text */}
            <div>
              <div class="flex items-center justify-between mb-2">
                <label class="text-sm font-medium text-gray-700">
                  Source ({props.sourceLanguage.toUpperCase()})
                </label>
                <Show when={translation()?.gitBlame}>
                  <span class="text-xs px-2 py-1 rounded text-gray-600 bg-gray-100">
                    imported from GitHub
                  </span>
                </Show>
              </div>
              <div class="p-3 bg-gray-50 rounded border text-gray-900 text-base">
                {translation()!.sourceValue}
              </div>
              <div class="text-xs text-gray-500 mt-1">
                {translation()!.sourceValue.length} chars
              </div>
              
              {/* Git Blame Info */}
              <Show when={translation()?.gitBlame}>
                {(blame) => (
                  <div class="mt-2 p-2 bg-blue-50 rounded text-xs text-gray-600">
                    <div class="font-medium text-blue-900 mb-1">Git Info:</div>
                    <div>Commit: <code class="text-blue-700">{blame().commit.substring(0, 7)}</code></div>
                    <div>Author: {blame().author}</div>
                    <div>Date: {new Date(blame().date).toLocaleDateString()}</div>
                  </div>
                )}
              </Show>
            </div>

            {/* Translation Input */}
            <div>
              <div class="flex items-center justify-between mb-2">
                <label class="block text-sm font-medium text-gray-700">
                  Translation ({props.language.toUpperCase()})
                </label>
                <Show when={!translation()?.isValid}>
                  <span class="text-xs px-2 py-1 rounded text-orange-700 bg-orange-100">
                    ⚠️ Source changed
                  </span>
                </Show>
              </div>
              <textarea
                value={props.translationValue}
                onInput={(e) => props.onTranslationChange(e.currentTarget.value)}
                class="w-full p-3 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[100px] lg:min-h-[120px] text-base resize-none"
                placeholder="Enter translation..."
              />
              <div class="space-y-2 mt-2">
                <div class="flex items-center justify-between gap-3">
                  <div class="text-xs text-gray-500">
                    {props.translationValue.length} chars
                    <Show
                      when={
                        props.translationValue.length >
                        translation()!.sourceValue.length * 1.5
                      }
                    >
                      <span class="text-orange-600 ml-2">⚠️</span>
                    </Show>
                  </div>
                  <button
                    onClick={props.onSave}
                    disabled={
                      props.isSaving ||
                      !props.translationValue.trim() ||
                      props.translationValue === translation()!.currentValue
                    }
                    class="px-6 py-3 text-base font-medium bg-green-600 text-white rounded-lg hover:bg-green-700 active:bg-green-800 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed transition"
                  >
                    {props.isSaving ? 'Saving...' : 'Save'}
                  </button>
                </div>
                <div class="text-xs text-gray-400 hidden lg:block">
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
        </div>
      </Show>
    </div>
  );
}
