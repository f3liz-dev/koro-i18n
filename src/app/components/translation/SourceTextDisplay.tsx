/**
 * Source text display component
 */

import { Component } from 'solid-js';

interface SourceTextDisplayProps {
  text: string;
  context?: string;
  placeholders?: string[];
  maxLength?: number;
  isRequired?: boolean;
}

const SourceTextDisplay: Component<SourceTextDisplayProps> = (props) => {
  // Highlight placeholders in the source text
  const highlightedText = () => {
    let text = props.text;
    
    if (props.placeholders && props.placeholders.length > 0) {
      props.placeholders.forEach(placeholder => {
        const regex = new RegExp(`(${placeholder.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'g');
        text = text.replace(regex, '<mark class="placeholder">$1</mark>');
      });
    }
    
    return text;
  };

  return (
    <div class="source-text-display">
      <div class="source-text-header">
        <span class="source-label">Source Text</span>
        {props.isRequired && (
          <span class="required-indicator" title="This translation is required">
            *
          </span>
        )}
        {props.maxLength && (
          <span class="max-length-indicator" title={`Maximum ${props.maxLength} characters`}>
            Max: {props.maxLength}
          </span>
        )}
      </div>
      
      <div 
        class="source-text-content"
        innerHTML={highlightedText()}
      />
      
      {props.context && (
        <div class="source-context">
          <span class="context-label">Context:</span>
          <span class="context-text">{props.context}</span>
        </div>
      )}
      
      {props.placeholders && props.placeholders.length > 0 && (
        <div class="placeholders-info">
          <span class="placeholders-label">Placeholders:</span>
          <div class="placeholders-list">
            {props.placeholders.map(placeholder => (
              <code class="placeholder-item">{placeholder}</code>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default SourceTextDisplay;