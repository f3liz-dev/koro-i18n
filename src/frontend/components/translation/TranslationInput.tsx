/**
 * Translation input component with validation and character count
 */

import { Component, createSignal, createEffect } from 'solid-js';
import { ValidationResult } from '../../types/Translation';

interface TranslationInputProps {
  value: string;
  sourceText: string;
  placeholder?: string;
  maxLength?: number;
  validation?: ValidationResult | null;
  onInput: (value: string) => void;
  onSubmit?: () => void;
  onFocus?: () => void;
  onBlur?: () => void;
  disabled?: boolean;
  autoFocus?: boolean;
}

const TranslationInput: Component<TranslationInputProps> = (props) => {
  let textareaRef: HTMLTextAreaElement | undefined;
  const [isFocused, setIsFocused] = createSignal(false);

  // Auto-resize textarea based on content
  const adjustHeight = () => {
    if (textareaRef) {
      textareaRef.style.height = 'auto';
      textareaRef.style.height = `${Math.max(textareaRef.scrollHeight, 100)}px`;
    }
  };

  // Focus effect
  createEffect(() => {
    if (props.autoFocus && textareaRef) {
      textareaRef.focus();
    }
  });

  // Adjust height when value changes
  createEffect(() => {
    props.value; // Track value changes
    setTimeout(adjustHeight, 0);
  });

  const handleInput = (e: Event) => {
    const target = e.target as HTMLTextAreaElement;
    props.onInput(target.value);
    adjustHeight();
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    // Ctrl/Cmd + Enter to submit
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      props.onSubmit?.();
    }
    
    // Escape to blur
    if (e.key === 'Escape') {
      textareaRef?.blur();
    }
  };

  const handleFocus = () => {
    setIsFocused(true);
    props.onFocus?.();
  };

  const handleBlur = () => {
    setIsFocused(false);
    props.onBlur?.();
  };

  // Character count and validation status
  const characterCount = () => props.value.length;
  const isOverLimit = () => props.maxLength ? characterCount() > props.maxLength : false;
  const hasErrors = () => props.validation?.errors.length ?? 0 > 0;
  const hasWarnings = () => props.validation?.warnings.length ?? 0 > 0;

  return (
    <div class="translation-input">
      <div class="relative">
        <textarea
          ref={textareaRef}
          value={props.value}
          placeholder={props.placeholder || 'Enter translation...'}
          disabled={props.disabled}
          class={`input translation-textarea ${isFocused() ? 'focused' : ''} ${hasErrors() ? 'error' : ''} ${hasWarnings() ? 'warning' : ''}`}
          onInput={handleInput}
          onKeyDown={handleKeyDown}
          onFocus={handleFocus}
          onBlur={handleBlur}
          style={{
            'min-height': '100px',
            'resize': 'none',
            'font-family': 'inherit',
            'line-height': '1.5'
          }}
        />
        
        {/* Character count */}
        <div class={`character-count ${isOverLimit() ? 'over-limit' : ''}`}>
          {characterCount()}
          {props.maxLength && ` / ${props.maxLength}`}
        </div>
      </div>

      {/* Validation messages */}
      {props.validation && (
        <div class="validation-messages">
          {props.validation.errors.map((error) => (
            <div class="validation-error">
              <span class="validation-icon">⚠️</span>
              {error.message}
            </div>
          ))}
          {props.validation.warnings.map((warning) => (
            <div class="validation-warning">
              <span class="validation-icon">⚡</span>
              {warning.message}
            </div>
          ))}
        </div>
      )}

      {/* Keyboard shortcuts hint */}
      {isFocused() && (
        <div class="keyboard-hints">
          <span class="hint">Ctrl+Enter to submit</span>
          <span class="hint">Esc to blur</span>
        </div>
      )}
    </div>
  );
};

export default TranslationInput;