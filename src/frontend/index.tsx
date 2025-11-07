/* @refresh reload */
import { render } from 'solid-js/web';

import App from './App';
import './styles/main.css';

// Service Worker Registration for PWA
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then((registration) => {
        console.log('SW registered: ', registration);
      })
      .catch((registrationError) => {
        console.log('SW registration failed: ', registrationError);
      });
  });
}

const root = document.getElementById('app');

if (!root) {
  throw new Error('Root element not found');
}

render(() => <App />, root);