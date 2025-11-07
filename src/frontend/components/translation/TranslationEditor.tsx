/**
 * Main translation editor component
 */

import { Component, onMount, onCleanup, Show, createMemo, createSignal } from 'solid-js';
import { useParams, useNavigate } from '@solidjs/router';
import { translationStore } from '../../stores/translationStore';
import { authStore } from '../../stores/authStore';
import { useBreakpoint, useTouch, useResponsive } from '../../hooks/useResponsive';
import { performanceMonitor } from '../../utils/deviceDetection';
import TranslationInput from './TranslationInput';
import SourceTextDisplay from './SourceTextDisplay';
import TranslationStringList from './TranslationStringList';
import TranslationProgress from './TranslationProgress';
import LoadingSpinner from '../ui/LoadingSpinner';
import ResponsiveLayout from '../layout/ResponsiveLayout';

interface TranslationEditorProps {
  projectId?: string;
  language?: string;
}

const TranslationEditor: Component<TranslationEditorProps> = (props) => {
  const params = useParams();
  const navigate = useNavigate();
  const breakpoint = useBreakpoint();
  const touch = useTouch();
  const responsive = useResponsive();
  
  const [isSidebarOpen, setIsSidebarOpen] = createSignal(false);
  const [performanceMetrics, setPerformanceMetrics] = createSignal<{
    lastInteractionTime: number;
    averageResponseTime: number;
  }>({ lastInteractionTime: 0, averageResponseTime: 0 });
  
  const projectId = () => props.projectId || params.projectId;
  const language = () => props.language || params.language || 'en';
  
  // Responsive behavior
  const shouldCollapseSidebar = () => breakpoint.isAtMost('md');
  const showMobileSidebar = () => shouldCollapseSidebar() && isSidebarOpen();

  // Auto-save status display
  const autoSaveStatus = createMemo(() => {
    const state = translationStore.autoSaveState;
    if (state.isSaving) return 'Saving...';
    if (state.error) return `Error: ${state.error}`;
    if (state.lastSaved) return `Saved at ${state.lastSaved.toLocaleTimeString()}`;
    if (state.isDirty) return 'Unsaved changes';
    return 'All changes saved';
  });

  // Draft keys for list display
  const draftKeys = createMemo(() => {
    const drafts = translationStore.strings.reduce((acc, string) => {
      const translation = translationStore.getTranslation(string.key);
      if (translation !== (string.translatedText || '')) {
        acc.add(string.key);
      }
      return acc;
    }, new Set<string>());
    return drafts;
  });

  // Performance monitoring for 200ms response time requirement
  const trackInteraction = (action: string) => {
    performanceMonitor.start(`interaction-${action}`);
    const startTime = performance.now();
    
    return () => {
      const duration = performanceMonitor.end(`interaction-${action}`);
      const endTime = performance.now();
      
      setPerformanceMetrics(prev => ({
        lastInteractionTime: endTime - startTime,
        averageResponseTime: (prev.averageResponseTime + duration) / 2,
      }));
      
      // Log slow interactions
      if (duration > 200) {
        console.warn(`Slow interaction detected: ${action} took ${duration.toFixed(2)}ms`);
      }
    };
  };

  // Keyboard shortcuts (desktop only)
  const handleKeyDown = (e: KeyboardEvent) => {
    // Skip keyboard shortcuts on touch devices
    if (touch.isTouchPrimary()) return;
    
    // Only handle shortcuts when not in an input field
    if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
      return;
    }

    const endTracking = trackInteraction('keyboard-navigation');

    switch (e.key) {
      case 'ArrowUp':
        e.preventDefault();
        translationStore.selectPreviousString();
        break;
      case 'ArrowDown':
        e.preventDefault();
        translationStore.selectNextString();
        break;
      case 'Enter':
        e.preventDefault();
        // Focus on translation input
        const textarea = document.querySelector('.translation-textarea') as HTMLTextAreaElement;
        textarea?.focus();
        break;
      case 'Escape':
        e.preventDefault();
        // Blur any focused input or close mobile sidebar
        if (showMobileSidebar()) {
          setIsSidebarOpen(false);
        } else {
          (document.activeElement as HTMLElement)?.blur();
        }
        break;
    }
    
    endTracking();
  };

  // Load project data on mount
  onMount(async () => {
    const pid = projectId();
    const lang = language();
    
    if (!pid) {
      navigate('/dashboard');
      return;
    }

    if (!authStore.isAuthenticated) {
      navigate('/login');
      return;
    }

    const result = await translationStore.loadProject(pid, lang);
    if (!result.success) {
      console.error('Failed to load project:', result.error);
    }
  });

  // Set up keyboard shortcuts
  onMount(() => {
    document.addEventListener('keydown', handleKeyDown);
  });

  onCleanup(() => {
    document.removeEventListener('keydown', handleKeyDown);
    translationStore.reset();
  });

  // Handle translation input changes with performance tracking
  const handleTranslationInput = (value: string) => {
    const endTracking = trackInteraction('translation-input');
    const current = translationStore.currentString;
    if (current) {
      translationStore.updateTranslation(current.key, value);
    }
    endTracking();
  };

  // Handle translation submission with performance tracking
  const handleSubmitTranslation = async () => {
    const endTracking = trackInteraction('translation-submit');
    const current = translationStore.currentString;
    if (!current) {
      endTracking();
      return;
    }

    const result = await translationStore.submitTranslation(current.key);
    if (result.success) {
      // Move to next string after successful submission
      translationStore.selectNextString();
      // Close mobile sidebar after submission on mobile
      if (shouldCollapseSidebar()) {
        setIsSidebarOpen(false);
      }
    } else {
      console.error('Failed to submit translation:', result.error);
    }
    endTracking();
  };

  // Handle string selection with performance tracking
  const handleStringSelection = (index: number) => {
    const endTracking = trackInteraction('string-selection');
    translationStore.selectString(index);
    // Close mobile sidebar after selection on mobile
    if (shouldCollapseSidebar()) {
      setIsSidebarOpen(false);
    }
    endTracking();
  };

  // Toggle mobile sidebar
  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen());
  };

  // Get current translation value
  const getCurrentTranslation = () => {
    const current = translationStore.currentString;
    return current ? translationStore.getTranslation(current.key) : '';
  };

  // Editor classes based on device capabilities
  const editorClasses = createMemo(() => {
    const classes = ['translation-editor'];
    if (touch.isTouchPrimary()) classes.push('touch-primary');
    if (responsive().isHighDPI) classes.push('high-dpi');
    classes.push(`breakpoint-${breakpoint.current()}`);
    return classes.join(' ');
  });

  // Sidebar component
  const sidebarContent = () => (
    <div class="editor-sidebar-content">
      <TranslationProgress
        progress={translationStore.progress}
        currentIndex={translationStore.selectedStringIndex}
        totalStrings={translationStore.totalStrings}
      />
      
      <TranslationStringList
        strings={translationStore.strings}
        selectedIndex={translationStore.selectedStringIndex}
        onSelectString={handleStringSelection}
        getTranslation={(key) => translationStore.getTranslation(key)}
        draftKeys={draftKeys()}
      />
    </div>
  );

  // Header component
  const headerContent = () => (
    <div class="editor-header">
      <div class="header-left">
        <Show when={shouldCollapseSidebar()}>
          <button 
            class="sidebar-toggle-btn"
            onClick={toggleSidebar}
            aria-label="Toggle sidebar"
          >
            <svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        </Show>
        
        <div class="project-info">
          <h1 class="project-title">{translationStore.project?.name}</h1>
          <p class="project-details">
            {translationStore.project?.repository.owner}/{translationStore.project?.repository.name} 
            • {language().toUpperCase()}
          </p>
        </div>
      </div>
      
      <div class="header-right">
        <div class="auto-save-status">
          <span class={`status-indicator ${translationStore.autoSaveState.isDirty ? 'dirty' : 'clean'}`}>
            {autoSaveStatus()}
          </span>
        </div>
        
        {/* Performance indicator (development only) */}
        <Show when={process.env.NODE_ENV === 'development' && performanceMetrics().lastInteractionTime > 0}>
          <div class="performance-indicator" title={`Last interaction: ${performanceMetrics().lastInteractionTime.toFixed(2)}ms`}>
            <span class={performanceMetrics().lastInteractionTime > 200 ? 'text-warning' : 'text-success'}>
              {performanceMetrics().lastInteractionTime.toFixed(0)}ms
            </span>
          </div>
        </Show>
      </div>
    </div>
  );

  return (
    <div class={editorClasses()}>
      <Show when={translationStore.isLoading}>
        <div class="loading-container">
          <LoadingSpinner />
          <p>Loading translation project...</p>
        </div>
      </Show>

      <Show when={translationStore.error}>
        <div class="error-container">
          <div class="error">
            <h3>Error Loading Project</h3>
            <p>{translationStore.error}</p>
            <button 
              class="btn btn-primary"
              onClick={() => navigate('/dashboard')}
            >
              Back to Dashboard
            </button>
          </div>
        </div>
      </Show>

      <Show when={!translationStore.isLoading && !translationStore.error && translationStore.project}>
        <ResponsiveLayout
          header={headerContent()}
          sidebar={sidebarContent()}
          collapsibleSidebar={true}
          mobileBreakpoint="md"
          className="translation-editor-layout"
        >
          <div class="editor-main">
            <Show when={translationStore.currentString}>
              <div class="translation-pair">
                {/* Source text */}
                <div class="source-section">
                  <SourceTextDisplay
                    text={translationStore.currentString!.sourceText}
                    context={translationStore.currentString!.context}
                    placeholders={translationStore.currentString!.placeholders}
                    maxLength={translationStore.currentString!.maxLength}
                    isRequired={translationStore.currentString!.isRequired}
                  />
                </div>

                {/* Translation input */}
                <div class="translation-section">
                  <div class="translation-header">
                    <span class="translation-label">Translation ({language().toUpperCase()})</span>
                    <div class="translation-actions">
                      <button
                        class="btn btn-secondary"
                        onClick={() => translationStore.saveDraft(translationStore.currentString!.key)}
                        disabled={translationStore.autoSaveState.isSaving}
                      >
                        <Show when={breakpoint.isAtLeast('sm')} fallback="Save">
                          Save Draft
                        </Show>
                      </button>
                      <button
                        class="btn btn-primary"
                        onClick={handleSubmitTranslation}
                        disabled={!translationStore.validationResult?.isValid}
                      >
                        <Show when={breakpoint.isAtLeast('sm')} fallback="Submit">
                          Submit Translation
                        </Show>
                      </button>
                    </div>
                  </div>

                  <TranslationInput
                    value={getCurrentTranslation()}
                    sourceText={translationStore.currentString!.sourceText}
                    placeholder={`Enter ${language().toUpperCase()} translation...`}
                    maxLength={translationStore.currentString!.maxLength}
                    validation={translationStore.validationResult}
                    onInput={handleTranslationInput}
                    onSubmit={handleSubmitTranslation}
                    autoFocus={!touch.isTouchPrimary()}
                  />
                </div>
              </div>

              {/* Navigation */}
              <div class="editor-navigation">
                <div class="nav-buttons">
                  <button
                    class="btn btn-secondary"
                    onClick={() => translationStore.selectPreviousString()}
                    disabled={translationStore.selectedStringIndex === 0}
                  >
                    ← <Show when={breakpoint.isAtLeast('sm')}>Previous</Show>
                  </button>
                  
                  <button
                    class="btn btn-secondary"
                    onClick={() => translationStore.selectNextString()}
                    disabled={translationStore.selectedStringIndex >= translationStore.totalStrings - 1}
                  >
                    <Show when={breakpoint.isAtLeast('sm')}>Next</Show> →
                  </button>
                </div>
                
                <span class="navigation-info">
                  {translationStore.selectedStringIndex + 1} of {translationStore.totalStrings}
                </span>
              </div>
            </Show>

            <Show when={!translationStore.currentString && translationStore.strings.length === 0}>
              <div class="empty-state">
                <h3>No Translation Strings</h3>
                <p>This project doesn't have any translation strings to work on.</p>
              </div>
            </Show>
          </div>

          {/* Keyboard shortcuts help (desktop only) */}
          <Show when={!touch.isTouchPrimary()}>
            <div class="keyboard-shortcuts">
              <details>
                <summary>Keyboard Shortcuts</summary>
                <div class="shortcuts-list">
                  <div class="shortcut">
                    <kbd>↑</kbd> <kbd>↓</kbd> Navigate strings
                  </div>
                  <div class="shortcut">
                    <kbd>Enter</kbd> Focus translation input
                  </div>
                  <div class="shortcut">
                    <kbd>Ctrl</kbd> + <kbd>Enter</kbd> Submit translation
                  </div>
                  <div class="shortcut">
                    <kbd>Esc</kbd> Blur input / Exit focus
                  </div>
                </div>
              </details>
            </div>
          </Show>
        </ResponsiveLayout>

        {/* Mobile sidebar overlay */}
        <Show when={showMobileSidebar()}>
          <div class="mobile-sidebar-overlay" onClick={() => setIsSidebarOpen(false)}>
            <div class="mobile-sidebar-content" onClick={(e) => e.stopPropagation()}>
              {sidebarContent()}
            </div>
          </div>
        </Show>
      </Show>
    </div>
  );
};

export default TranslationEditor;