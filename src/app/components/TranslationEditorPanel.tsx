import { Show } from "solid-js";
import TranslationSuggestionsPanel from "./TranslationSuggestionsPanel";

interface TranslationString {
  key: string;
  sourceValue: string;
  currentValue?: string;
}

interface SuggestionEntry {
  id: string;
  projectId: string;
  language: string;
  key: string;
  value: string;
  userId: string;
  username?: string;
  avatarUrl?: string;
  status: "pending" | "approved" | "committed" | "rejected" | "deleted";
  createdAt: string;
  updatedAt: string;
}

interface TranslationEditorPanelProps {
  selectedKey: string | null;
  translationStrings: TranslationString[];
  language: string;
  translationValue: string;
  showSuggestions: boolean;
  suggestions: SuggestionEntry[] | undefined;
  isLoadingSuggestions: boolean;
  currentIndex: number;
  totalCount: number;
  onTranslationChange: (value: string) => void;
  onSave: () => void;
  onToggleSuggestions: () => void;
  onApproveSuggestion?: (id: string) => void;
  onRejectSuggestion?: (id: string) => void;
  onPrevious: () => void;
  onNext: () => void;
}

export default function TranslationEditorPanel(
  props: TranslationEditorPanelProps,
) {
  const str = () =>
    props.translationStrings.find((s) => s.key === props.selectedKey);

  return (
    <div class="order-1 lg:order-2 bg-white rounded-lg shadow flex-shrink-0 flex flex-col overflow-hidden max-h-[calc(100vh-100px)]">
      {props.selectedKey && str() ? (
        <div class="flex flex-col h-full overflow-hidden">
          <div class="p-2 lg:p-4 border-b flex-shrink-0">
            <code class="text-xs lg:text-sm font-mono text-gray-700 block mb-2 lg:mb-3 break-all">
              {str()!.key}
            </code>
            <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 lg:gap-3">
              <button
                onClick={props.onToggleSuggestions}
                class="text-xs lg:text-sm text-blue-600 hover:text-blue-800"
              >
                {props.showSuggestions ? "Hide" : "Show"} Suggestions
              </button>
              <div class="flex items-center gap-2">
                <button
                  onClick={props.onPrevious}
                  disabled={props.currentIndex === 1}
                  class="px-4 py-2.5 lg:py-2 border rounded hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed flex items-center gap-2"
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
                  class="px-4 py-2.5 lg:py-2 border rounded hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed flex items-center gap-2"
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

          <div class="p-2 lg:p-4 space-y-2 lg:space-y-4 flex-shrink-0 overflow-y-auto">
            {/* Source Text */}
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">
                Source (English)
              </label>
              <div class="p-3 bg-gray-50 rounded border text-gray-900 text-base">
                {str()!.sourceValue}
              </div>
              <div class="text-xs text-gray-500 mt-1">
                {str()!.sourceValue.length} chars
              </div>
            </div>

            {/* Translation Input */}
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">
                Translation ({props.language.toUpperCase()})
              </label>
              <textarea
                value={props.translationValue}
                onInput={(e) =>
                  props.onTranslationChange(e.currentTarget.value)
                }
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
                        str()!.sourceValue.length * 1.5
                      }
                    >
                      <span class="text-orange-600 ml-2">⚠️</span>
                    </Show>
                  </div>
                  <button
                    onClick={props.onSave}
                    class="px-6 py-3 text-base font-medium bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled={
                      !props.translationValue.trim() ||
                      props.translationValue === str()!.currentValue
                    }
                  >
                    Save
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
            isLoading={props.isLoadingSuggestions}
            onApprove={props.onApproveSuggestion}
            onReject={props.onRejectSuggestion}
          />
        </div>
      ) : (
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
            <p class="text-base lg:text-lg">
              Select a translation string to edit
            </p>
            <p class="text-xs lg:text-sm text-gray-400 mt-1 lg:mt-2 lg:hidden">
              Tap the menu to select
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
