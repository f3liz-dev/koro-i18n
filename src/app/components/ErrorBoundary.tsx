import { ErrorBoundary as SolidErrorBoundary, JSX } from 'solid-js';

interface ErrorBoundaryProps {
  children?: JSX.Element;
}

export function ErrorBoundary(props: ErrorBoundaryProps) {
  return (
    <SolidErrorBoundary
      fallback={(err) => (
        <div class="page min-h-screen flex items-center justify-center p-6">
          <div class="card text-center message error">
            <h2 class="text-lg font-bold text-gray-900 mb-2">Something went wrong</h2>
            <p class="text-sm text-gray-600 mb-4">An unexpected error occurred. Please try refreshing the page.</p>
            <pre class="text-xs text-left text-red-700 bg-red-100 p-2 rounded overflow-auto max-h-48">{String(err)}</pre>
            <div class="mt-4">
              <button
                onClick={() => window.location.reload()}
                class="btn"
              >
                Refresh
              </button>
            </div>
          </div>
        </div>
      )}
    >
      {props.children}
    </SolidErrorBoundary>
  );
}

export default ErrorBoundary;
