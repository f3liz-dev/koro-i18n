import { createSignal, JSX } from 'solid-js';
import { ErrorBoundary as SolidErrorBoundary } from 'solid-js';

interface Props {
  children: JSX.Element;
}

export default function ErrorBoundary(props: Props) {
  const [error, setError] = createSignal<Error | null>(null);

  return (
    <SolidErrorBoundary
      fallback={(err: Error) => {
        setError(err);
        return (
          <div class="min-h-screen bg-gray-50 flex items-center justify-center px-6">
            <div class="max-w-md w-full bg-white rounded-lg shadow-md p-6">
              <div class="text-center">
                <div class="text-red-600 text-5xl mb-4">⚠️</div>
                <h1 class="text-2xl font-bold text-gray-900 mb-2">Something went wrong</h1>
                <p class="text-gray-600 mb-4">
                  An error occurred while loading this page.
                </p>
                <details class="text-left mb-4">
                  <summary class="cursor-pointer text-sm text-gray-500 hover:text-gray-700 active:text-gray-800 transition">
                    Error details
                  </summary>
                  <pre class="mt-2 p-3 bg-gray-100 rounded text-xs overflow-auto max-h-40">
                    {err.message}
                    {err.stack ? '\n\n' + err.stack : ''}
                  </pre>
                </details>
                <button
                  onClick={() => window.location.href = '/'}
                  class="w-full px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 active:bg-gray-950 transition"
                >
                  Go to Home
                </button>
              </div>
            </div>
          </div>
        );
      }}
    >
      {props.children}
    </SolidErrorBoundary>
  );
}
