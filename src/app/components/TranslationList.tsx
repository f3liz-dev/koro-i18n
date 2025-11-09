import { For, Show } from 'solid-js';

interface TranslationString {
  key: string;
  sourceValue: string;
  currentValue?: string;
}

interface TranslationListProps {
  translationStrings: TranslationString[];
  selectedKey: string | null;
  language: string;
  isLoading: boolean;
  onSelectKey: (key: string) => void;
}

export default function TranslationList(props: TranslationListProps) {
  return (
    <div class="bg-white rounded-lg shadow flex-1 lg:h-[calc(100vh-200px)] lg:sticky lg:top-20 flex flex-col overflow-hidden">
      <div class="p-2 lg:p-4 border-b flex-shrink-0">
        <h2 class="text-base lg:text-lg font-semibold">Translation Strings</h2>
        <p class="text-xs lg:text-sm text-gray-600">
          {props.translationStrings.length} strings
        </p>
      </div>
      <div class="divide-y overflow-y-auto flex-1">
        <Show when={props.isLoading}>
          <div class="p-4 lg:p-8 text-center text-gray-500">
            <div class="animate-spin rounded-full h-8 w-8 lg:h-12 lg:w-12 border-b-2 border-blue-600 mx-auto mb-2 lg:mb-4"></div>
            <p class="text-sm lg:text-base">Loading...</p>
          </div>
        </Show>
        <Show when={!props.isLoading && props.translationStrings.length === 0}>
          <div class="p-4 lg:p-8 text-center text-gray-500">
            <p class="mb-1 lg:mb-2 text-sm lg:text-base">No translation files found</p>
            <p class="text-xs lg:text-sm">Upload files first</p>
          </div>
        </Show>
        <For each={props.translationStrings}>
          {(str) => (
            <div
              class={`p-3 lg:p-4 cursor-pointer hover:bg-gray-50 transition ${
                props.selectedKey === str.key ? 'bg-blue-50 border-l-4 border-blue-500' : ''
              }`}
              onClick={() => props.onSelectKey(str.key)}
            >
              <div class="flex items-start justify-between mb-1 lg:mb-2">
                <code class="text-xs lg:text-sm font-mono text-gray-700 truncate pr-2">{str.key}</code>
                <Show when={str.currentValue}>
                  <span class="text-xs bg-green-100 text-green-800 px-1.5 lg:px-2 py-0.5 lg:py-1 rounded whitespace-nowrap">
                    ✓
                  </span>
                </Show>
              </div>
              <div class="text-xs lg:text-sm text-gray-600 mb-0.5 lg:mb-1 truncate">
                <span class="font-medium">EN:</span> {str.sourceValue}
              </div>
              <Show when={str.currentValue}>
                <div class="text-xs lg:text-sm text-gray-900 truncate">
                  <span class="font-medium">{props.language.toUpperCase()}:</span> {str.currentValue}
                </div>
              </Show>
              <Show when={!str.currentValue}>
                <div class="text-xs lg:text-sm text-gray-400 italic">
                  No translation
                </div>
              </Show>
            </div>
          )}
        </For>
      </div>
    </div>
  );
}
