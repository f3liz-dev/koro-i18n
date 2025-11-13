/**
 * Preload frequently-used pages after initial page load
 * 
 * This improves navigation performance by loading page chunks asynchronously
 * in the background after the homepage is loaded, without blocking the initial render.
 */

let preloadStarted = false;

/**
 * Preload frequently-used pages in the background
 * This should be called after the initial page has loaded
 */
export function preloadFrequentPages() {
  // Ensure we only preload once
  if (preloadStarted) return;
  preloadStarted = true;

  // Use requestIdleCallback to preload during idle time, or setTimeout as fallback
  const schedulePreload = (callback: () => void) => {
    if ('requestIdleCallback' in window) {
      requestIdleCallback(callback, { timeout: 2000 });
    } else {
      setTimeout(callback, 1);
    }
  };

  // Preload pages in order of likely usage
  const pagesToPreload = [
    () => import('../pages/LoginPage'),
    () => import('../pages/DashboardPage'),
    () => import('../pages/LanguageSelectionPage'),
    () => import('../pages/FileSelectionPage'),
    () => import('../pages/TranslationEditorPage'),
  ];

  // Preload each page with a small delay between them
  let index = 0;
  const preloadNext = () => {
    if (index < pagesToPreload.length) {
      schedulePreload(() => {
        pagesToPreload[index]()
          .then(() => {
            console.log(`[Preload] Loaded page ${index + 1}/${pagesToPreload.length}`);
            index++;
            preloadNext();
          })
          .catch((error) => {
            console.warn(`[Preload] Failed to load page ${index + 1}:`, error);
            index++;
            preloadNext();
          });
      });
    }
  };

  // Start preloading
  preloadNext();
}
