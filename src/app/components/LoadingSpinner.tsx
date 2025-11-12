export default function LoadingSpinner() {
  return (
    <div class="min-h-screen bg-gray-50 flex items-center justify-center">
      <div class="text-center">
        <div class="inline-block w-12 h-12 border-4 border-gray-300 border-t-gray-900 rounded-full animate-spin" role="status" aria-label="Loading"></div>
        <p class="mt-4 text-gray-600">Loading...</p>
      </div>
    </div>
  );
}
