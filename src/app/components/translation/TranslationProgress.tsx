/**
 * Translation progress indicator component
 */

import { Component } from 'solid-js';
import { TranslationProgress as ProgressType } from '../../types/Translation';

interface TranslationProgressProps {
  progress: ProgressType | null;
  currentIndex: number;
  totalStrings: number;
}

const TranslationProgress: Component<TranslationProgressProps> = (props) => {
  const currentProgress = () => {
    if (props.progress) {
      return props.progress.percentage;
    }
    // Fallback calculation
    return props.totalStrings > 0 ? Math.round((props.currentIndex / props.totalStrings) * 100) : 0;
  };

  const progressStats = () => {
    if (props.progress) {
      return {
        translated: props.progress.translatedStrings,
        draft: props.progress.draftStrings,
        total: props.progress.totalStrings,
        remaining: props.progress.totalStrings - props.progress.translatedStrings - props.progress.draftStrings
      };
    }
    
    return {
      translated: 0,
      draft: 0,
      total: props.totalStrings,
      remaining: props.totalStrings
    };
  };

  return (
    <div class="translation-progress">
      <div class="progress-header">
        <h3 class="progress-title">Translation Progress</h3>
        <span class="progress-percentage">{currentProgress()}%</span>
      </div>
      
      <div class="progress-bar-container">
        <div class="progress-bar">
          <div 
            class="progress-fill"
            style={{ width: `${currentProgress()}%` }}
          />
        </div>
      </div>
      
      <div class="progress-stats">
        <div class="stat-item">
          <span class="stat-icon">✅</span>
          <span class="stat-label">Translated:</span>
          <span class="stat-value">{progressStats().translated}</span>
        </div>
        
        <div class="stat-item">
          <span class="stat-icon">📝</span>
          <span class="stat-label">Draft:</span>
          <span class="stat-value">{progressStats().draft}</span>
        </div>
        
        <div class="stat-item">
          <span class="stat-icon">⭕</span>
          <span class="stat-label">Remaining:</span>
          <span class="stat-value">{progressStats().remaining}</span>
        </div>
        
        <div class="stat-item">
          <span class="stat-icon">📊</span>
          <span class="stat-label">Total:</span>
          <span class="stat-value">{progressStats().total}</span>
        </div>
      </div>
      
      <div class="current-position">
        String {props.currentIndex + 1} of {props.totalStrings}
      </div>
    </div>
  );
};

export default TranslationProgress;