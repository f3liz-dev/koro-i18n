export function LoadingSpinner() {
  return (
    <div class="min-h-screen bg-gray-50 flex items-center justify-center">
      <div class="text-center">
        <div class="inline-block w-8 h-8 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" role="status" aria-label="Loading"></div>
        <p class="mt-4 text-gray-600">Loading...</p>
      </div>
    </div>
  );
}
