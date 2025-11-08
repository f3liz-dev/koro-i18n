import { lazy, Suspense } from 'solid-js';
import { Router, Route } from '@solidjs/router';

const HomePage = lazy(() => import('./pages/HomePage'));
const LoginPage = lazy(() => import('./pages/LoginPage'));
const DashboardPage = lazy(() => import('./pages/DashboardPage'));
const TranslationEditorPage = lazy(() => import('./pages/TranslationEditorPage'));
const TranslationHistoryPage = lazy(() => import('./pages/TranslationHistoryPage'));

export default function App() {
  return (
    <Router>
      <Suspense fallback={<div>Loading...</div>}>
        <Route path="/" component={HomePage} />
        <Route path="/login" component={LoginPage} />
        <Route path="/dashboard" component={DashboardPage} />
        <Route path="/projects/:projectId/translate/:language?" component={TranslationEditorPage} />
        <Route path="/history" component={TranslationHistoryPage} />
        <Route path="*" component={() => <div>404 Not Found</div>} />
      </Suspense>
    </Router>
  );
}