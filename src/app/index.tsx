import { render } from 'solid-js/web';
import App from './App';
import 'virtual:uno.css';
import './styles/main.css';
import { initializeForesight } from './utils/prefetch';

// Initialize ForesightJS for smart prefetching
initializeForesight();

render(() => <App />, document.getElementById('app')!);