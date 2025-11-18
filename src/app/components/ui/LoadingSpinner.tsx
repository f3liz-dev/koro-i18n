export function LoadingSpinner() {
  return (
    <div class="page" style="display: flex; align-items: center; justify-content: center;">
      <div class="card" style="text-align: center; padding: 2rem;">
        <div
          style="
            display: inline-block;
            width: 2.5rem;
            height: 2.5rem;
            border: 3px solid var(--color-gray-200);
            border-top-color: var(--color-black);
            border-radius: 50%;
            animation: spin 0.8s linear infinite;
          "
          role="status"
          aria-label="Loading"
        />
        <p style="margin-top: 0.75rem; font-size: 0.813rem; color: var(--color-gray-600); font-weight: 500;">Loading...</p>
      </div>
      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
