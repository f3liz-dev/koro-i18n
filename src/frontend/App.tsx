import { Component, lazy, Suspense } from 'solid-js';
import { Router, Route } from '@solidjs/router';
import { ErrorBoundary } from 'solid-js';
import LoadingSpinner from './components/ui/LoadingSpinner';
import ErrorFallback from './components/ui/ErrorFallback';
import Navigation from './components/layout/Navigation';

// Lazy load components for better performance and bundle splitting
const HomePage = lazy(() => import('./pages/HomePage'));
const LoginPage = lazy(() => import('./pages/LoginPage'));
const DashboardPage = lazy(() => import('./pages/DashboardPage'));
const TranslationEditorPage = lazy(() => import('./pages/TranslationEditorPage'));
const OAuthCallback = lazy(() => import('./components/auth/OAuthCallback'));

const App: Component = () => {
  return (
    <ErrorBoundary fallback={(err, reset) => <ErrorFallback error={err} reset={reset} />}>
      <Router>
        <div class="min-h-screen" style="background-color: var(--color-background)">
          <Navigation />
          <Suspense fallback={<LoadingSpinner />}>
            <Route path="/" component={HomePage} />
            <Route path="/login" component={LoginPage} />
            <Route path="/auth/callback" component={OAuthCallback} />
            <Route path="/dashboard" component={DashboardPage} />
            <Route path="/projects/:projectId/translate/:language?" component={TranslationEditorPage} />
            <Route path="*" component={() => (
              <div class="container py-lg text-center">
                <h1 class="text-2xl font-bold mb-md">Page Not Found</h1>
                <p class="text-muted mb-lg">The page you're looking for doesn't exist.</p>
                <a href="/" class="btn btn-primary">Go Home</a>
              </div>
            )} />
          </Suspense>
        </div>
      </Router>
    </ErrorBoundary>
  );
};

export default App;