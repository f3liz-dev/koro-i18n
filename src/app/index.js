import { Elm } from '../Main.elm';
import './styles/minimal.css';

// Resolve backend URL for OAuth and API calls. In dev, default to the Workers dev port.
const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || (import.meta.env.MODE === 'development' ? 'http://localhost:8787' : window.location.origin);

const app = Elm.Main.init({
  node: document.getElementById('app'),
  flags: BACKEND_URL
});
