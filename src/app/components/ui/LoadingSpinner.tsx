export function LoadingSpinner() {
  return (
    <div class="min-h-screen flex items-center justify-center">
      <div class="text-center kawaii-card">
        <div
          class="inline-block w-10 h-10 border-2 border-gray-300 border-t-transparent rounded-full animate-spin"
          role="status"
          aria-label="読み込み中"
        />
        <p class="mt-3 text-sm text-gray-600">読み込み中…</p>
      </div>
    </div>
  );
}
