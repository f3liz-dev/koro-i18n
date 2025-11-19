import { lazy, Suspense } from 'solid-js';
import { Router, Route } from '@solidjs/router';
import type { RouteSectionProps } from '@solidjs/router';
import { ErrorBoundary, LoadingSpinner } from './components';
import { KawaiiLayout } from './components/KawaiiLayout';
import { I18nProvider } from './utils/i18n';

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
    <KawaiiLayout>
      <Suspense fallback={
        <div class="flex items-center justify-center min-h-[50vh]">
          <LoadingSpinner />
        </div>
      }>
        {props.children}
      </Suspense>
    </KawaiiLayout>
  );
}

export default function App() {
  return (
    <I18nProvider>
      <ErrorBoundary>
        <Router root={RootLayout}>
          <Route path="/" component={HomePage} />
          <Route path="/login" component={LoginPage} />
          <Route path="/projects" component={DashboardPage} />
          <Route path="/dashboard" component={DashboardPage} />
          <Route path="/projects/create" component={CreateProjectPage} />
          <Route path="/projects/join" component={JoinProjectPage} />
          <Route path="/projects/:projectName" component={LanguageSelectionPage} />
          <Route path="/projects/:projectName/language/:language" component={FileSelectionPage} />
          <Route path="/projects/:projectName/settings" component={ProjectSettingsPage} />
          <Route path="/projects/:projectName/manage" component={ProjectSettingsPage} />
          <Route path="/projects/:projectName/translate/:language/:filename" component={TranslationEditorPage} />
          <Route path="/projects/:projectName/translate/:language?" component={TranslationEditorPage} />
          <Route path="/projects/:projectName/suggestions" component={TranslationSuggestionsPage} />
          <Route path="/history" component={TranslationHistoryPage} />
          <Route path="*" component={NotFoundPage} />
        </Router>
      </ErrorBoundary>
    </I18nProvider>
  );
}
