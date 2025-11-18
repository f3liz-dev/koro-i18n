export function LoadingSpinner() {
  return (
    <div class="page" style="display: flex; align-items: center; justify-content: center;">
      <div class="card" style="text-align: center; padding: 2.5rem;">
        <div
          style="
            display: inline-block;
            width: 3rem;
            height: 3rem;
            border: 3px solid var(--color-border-medium);
            border-top-color: var(--color-accent-peach);
            border-radius: 50%;
            animation: spin 0.8s linear infinite;
            box-shadow: var(--shadow-soft);
          "
          role="status"
          aria-label="Loading"
        />
        <p style="margin-top: 1rem; font-size: 0.875rem; color: var(--color-text-secondary); font-weight: 500;">Loading...</p>
      </div>
      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
