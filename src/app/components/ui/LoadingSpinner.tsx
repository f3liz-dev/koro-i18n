export function LoadingSpinner() {
  return (
    <div class="kawaii-page flex items-center justify-center">
      <div class="text-center kawaii-card" style="padding: 32px;">
        <div
          style="display: inline-block; width: 40px; height: 40px; border: 3px solid var(--kawaii-pink); border-top-color: var(--kawaii-accent); border-radius: 50%; animation: spin 0.8s linear infinite;"
          role="status"
          aria-label="読み込み中"
        />
        <p style="margin-top: 12px; font-size: 13px; color: var(--kawaii-muted); font-weight: 600;">読み込み中…</p>
      </div>
      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
