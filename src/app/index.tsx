import { render } from 'solid-js/web';
import App from './App';
import 'virtual:uno.css';
// Use the new minimal theme by default — removes bulky kawaii tokens.
import './styles/minimal.css';

render(() => <App />, document.getElementById('app')!);