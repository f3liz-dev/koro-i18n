/**
 * Translation string list component for navigation
 */

import { Component, For, createMemo } from 'solid-js';
import { TranslationString } from '../../types/Translation';

interface TranslationStringListProps {
  strings: TranslationString[];
  selectedIndex: number;
  onSelectString: (index: number) => void;
  getTranslation: (key: string) => string;
  draftKeys: Set<string>;
}

const TranslationStringList: Component<TranslationStringListProps> = (props) => {
  // Filter and search functionality
  const filteredStrings = createMemo(() => {
    // For now, return all strings. Can add filtering later
    return props.strings.map((string, index) => ({ string, originalIndex: index }));
  });

  const getStringStatus = (stringItem: TranslationString) => {
    const translation = props.getTranslation(stringItem.key);
    const hasDraft = props.draftKeys.has(stringItem.key);
    
    if (hasDraft) return 'draft';
    if (translation && translation.trim()) return 'translated';
    if (stringItem.isRequired) return 'required';
    return 'empty';
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'translated': return '✅';
      case 'draft': return '📝';
      case 'required': return '❗';
      default: return '⭕';
    }
  };

  const getStatusClass = (status: string) => {
    switch (status) {
      case 'translated': return 'status-translated';
      case 'draft': return 'status-draft';
      case 'required': return 'status-required';
      default: return 'status-empty';
    }
  };

  return (
    <div class="translation-string-list">
      <div class="list-header">
        <h3 class="list-title">Translation Strings</h3>
        <div class="list-stats">
          {filteredStrings().length} strings
        </div>
      </div>
      
      <div class="list-content">
        <For each={filteredStrings()}>
          {({ string, originalIndex }) => {
            const status = getStringStatus(string);
            const isSelected = originalIndex === props.selectedIndex;
            
            return (
              <div
                class={`string-item ${isSelected ? 'selected' : ''} ${getStatusClass(status)}`}
                onClick={() => props.onSelectString(originalIndex)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    props.onSelectString(originalIndex);
                  }
                }}
              >
                <div class="string-header">
                  <span class="string-status" title={`Status: ${status}`}>
                    {getStatusIcon(status)}
                  </span>
                  <span class="string-key">{string.key}</span>
                </div>
                
                <div class="string-preview">
                  {string.sourceText.length > 60 
                    ? `${string.sourceText.substring(0, 60)}...`
                    : string.sourceText
                  }
                </div>
                
                {props.getTranslation(string.key) && (
                  <div class="translation-preview">
                    {props.getTranslation(string.key).length > 60
                      ? `${props.getTranslation(string.key).substring(0, 60)}...`
                      : props.getTranslation(string.key)
                    }
                  </div>
                )}
              </div>
            );
          }}
        </For>
      </div>
    </div>
  );
};

export default TranslationStringList;