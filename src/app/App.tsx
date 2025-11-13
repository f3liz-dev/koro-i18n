import { lazy, Suspense } from 'solid-js';
import { Router, Route } from '@solidjs/router';
import ErrorBoundary from './components/ErrorBoundary';
import LoadingSpinner from './components/LoadingSpinner';

// Import frequently-used pages directly for instant transitions
import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import LanguageSelectionPage from './pages/LanguageSelectionPage';
import FileSelectionPage from './pages/FileSelectionPage';
import TranslationEditorPage from './pages/TranslationEditorPage';

// Lazy load infrequently-used pages to keep initial bundle size reasonable
const CreateProjectPage = lazy(() => import('./pages/CreateProjectPage'));
const ProjectSettingsPage = lazy(() => import('./pages/ProjectSettingsPage'));
const TranslationHistoryPage = lazy(() => import('./pages/TranslationHistoryPage'));
const TranslationSuggestionsPage = lazy(() => import('./pages/TranslationSuggestionsPage'));
const JoinProjectPage = lazy(() => import('./pages/JoinProjectPage'));
const NotFoundPage = lazy(() => import('./pages/NotFoundPage'));

export default function App() {
  return (
    <ErrorBoundary>
      <Router>
        <Suspense fallback={<LoadingSpinner />}>
          <Route path="/" component={HomePage} />
          <Route path="/login" component={LoginPage} />
          <Route path="/dashboard" component={DashboardPage} />
          <Route path="/projects/create" component={CreateProjectPage} />
          <Route path="/projects/join" component={JoinProjectPage} />
          <Route path="/projects/:id" component={LanguageSelectionPage} />
          <Route path="/projects/:id/language/:language" component={FileSelectionPage} />
          <Route path="/projects/:id/settings" component={ProjectSettingsPage} />
          <Route path="/projects/:id/manage" component={ProjectSettingsPage} /> {/* Backward compatibility */}
          <Route path="/projects/:projectId/translate/:language/:filename" component={TranslationEditorPage} />
          <Route path="/projects/:projectId/translate/:language?" component={TranslationEditorPage} />
          <Route path="/projects/:projectId/suggestions" component={TranslationSuggestionsPage} />
          <Route path="/history" component={TranslationHistoryPage} />
          <Route path="*" component={NotFoundPage} />
        </Suspense>
      </Router>
    </ErrorBoundary>
  );
}