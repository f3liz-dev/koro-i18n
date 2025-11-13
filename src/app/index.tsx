import { render } from 'solid-js/web';
import App from './App';
import 'virtual:uno.css';
import './styles/main.css';
import { initializeForesight } from './utils/prefetch';
import { preloadFrequentPages } from './utils/preloadPages';

// Initialize ForesightJS for smart prefetching
initializeForesight();

render(() => <App />, document.getElementById('app')!);

// Preload frequently-used pages after initial render
// This happens asynchronously and doesn't block the initial page load
if (typeof window !== 'undefined') {
  // Wait for the initial page to be interactive before preloading
  if (document.readyState === 'complete') {
    preloadFrequentPages();
  } else {
    window.addEventListener('load', () => {
      preloadFrequentPages();
    });
  }
}