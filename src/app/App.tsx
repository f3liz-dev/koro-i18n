import { lazy, Suspense } from 'solid-js';
import { Router, Route } from '@solidjs/router';
import type { RouteSectionProps } from '@solidjs/router';
import { ErrorBoundary, LoadingSpinner } from './components';

const HomePage = lazy(() => import('./pages/HomePage'));
const LoginPage = lazy(() => import('./pages/LoginPage'));
const DashboardPage = lazy(() => import('./pages/DashboardPage'));
const LanguageSelectionPage = lazy(() => import('./pages/LanguageSelectionPage'));
const FileSelectionPage = lazy(() => import('./pages/FileSelectionPage'));
const TranslationEditorPage = lazy(() => import('./pages/TranslationEditorPage'));
const CreateProjectPage = lazy(() => import('./pages/CreateProjectPage'));
const ProjectSettingsPage = lazy(() => import('./pages/ProjectSettingsPage'));
const TranslationHistoryPage = lazy(() => import('./pages/TranslationHistoryPage'));
const TranslationSuggestionsPage = lazy(() => import('./pages/TranslationSuggestionsPage'));
const JoinProjectPage = lazy(() => import('./pages/JoinProjectPage'));
const NotFoundPage = lazy(() => import('./pages/NotFoundPage'));

function RootLayout(props: RouteSectionProps) {
  return (
    <Suspense fallback={<LoadingSpinner />}>
      {props.children}
    </Suspense>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <Router root={RootLayout}>
        <Route path="/" component={HomePage} />
        <Route path="/login" component={LoginPage} />
        <Route path="/dashboard" component={DashboardPage} />
        <Route path="/projects/create" component={CreateProjectPage} />
        <Route path="/projects/join" component={JoinProjectPage} />
        <Route path="/projects/:id" component={LanguageSelectionPage} />
        <Route path="/projects/:id/language/:language" component={FileSelectionPage} />
        <Route path="/projects/:id/settings" component={ProjectSettingsPage} />
        <Route path="/projects/:id/manage" component={ProjectSettingsPage} />
        <Route path="/projects/:projectId/translate/:language/:filename" component={TranslationEditorPage} />
        <Route path="/projects/:projectId/translate/:language?" component={TranslationEditorPage} />
        <Route path="/projects/:projectId/suggestions" component={TranslationSuggestionsPage} />
        <Route path="/history" component={TranslationHistoryPage} />
        <Route path="*" component={NotFoundPage} />
      </Router>
    </ErrorBoundary>
  );
}
