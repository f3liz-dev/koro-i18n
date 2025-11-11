import { lazy, Suspense } from 'solid-js';
import { Router, Route } from '@solidjs/router';

const HomePage = lazy(() => import('./pages/HomePage'));
const LoginPage = lazy(() => import('./pages/LoginPage'));
const DashboardPage = lazy(() => import('./pages/DashboardPage'));
const CreateProjectPage = lazy(() => import('./pages/CreateProjectPage'));
const ProjectPage = lazy(() => import('./pages/ProjectPage'));
const ProjectSettingsPage = lazy(() => import('./pages/ProjectSettingsPage'));
const TranslationEditorPage = lazy(() => import('./pages/TranslationEditorPage'));
const TranslationHistoryPage = lazy(() => import('./pages/TranslationHistoryPage'));
const TranslationSuggestionsPage = lazy(() => import('./pages/TranslationSuggestionsPage'));
const JoinProjectPage = lazy(() => import('./pages/JoinProjectPage'));

export default function App() {
  return (
    <Router>
      <Suspense fallback={<div>Loading...</div>}>
        <Route path="/" component={HomePage} />
        <Route path="/login" component={LoginPage} />
        <Route path="/dashboard" component={DashboardPage} />
        <Route path="/projects/create" component={CreateProjectPage} />
        <Route path="/projects/join" component={JoinProjectPage} />
        <Route path="/projects/:id" component={ProjectPage} />
        <Route path="/projects/:id/settings" component={ProjectSettingsPage} />
        <Route path="/projects/:id/manage" component={ProjectSettingsPage} /> {/* Backward compatibility */}
        <Route path="/projects/:projectId/translate/:language/:filename" component={TranslationEditorPage} />
        <Route path="/projects/:projectId/translate/:language?" component={TranslationEditorPage} />
        <Route path="/projects/:projectId/suggestions" component={TranslationSuggestionsPage} />
        <Route path="/history" component={TranslationHistoryPage} />
        <Route path="*" component={() => <div>404 Not Found</div>} />
      </Suspense>
    </Router>
  );
}