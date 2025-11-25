import { render } from 'solid-js/web';
import App from './App';
// Simple and intuitive styling without CSS frameworks
import './styles/minimal.css';

render(() => <App />, document.getElementById('app')!);