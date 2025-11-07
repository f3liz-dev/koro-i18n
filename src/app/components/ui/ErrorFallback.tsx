import { Component } from 'solid-js';

interface ErrorFallbackProps {
  error: Error;
  reset: () => void;
}

const ErrorFallback: Component<ErrorFallbackProps> = (props) => {
  return (
    <div class="error-container">
      <div class="error">
        <h2 class="text-xl font-semibold mb-md">Something went wrong</h2>
        <p class="text-muted mb-lg">{props.error.message}</p>
        <div class="flex gap-md justify-center">
          <button 
            class="btn btn-primary"
            onClick={props.reset}
          >
            Try Again
          </button>
          <button 
            class="btn btn-secondary"
            onClick={() => window.location.href = '/'}
          >
            Go Home
          </button>
        </div>
      </div>
    </div>
  );
};

export default ErrorFallback;