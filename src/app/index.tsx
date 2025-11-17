import { render } from 'solid-js/web';
import App from './App';
import 'virtual:uno.css';
import './styles/main.css';

render(() => <App />, document.getElementById('app')!);