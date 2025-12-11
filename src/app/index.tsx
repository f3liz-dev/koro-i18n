// Import Elm app
// @ts-ignore
import { Elm } from '../../elm/Main.elm';

// Import styles
import './styles/minimal.css';

// Initialize the Elm application
const app = Elm.Main.init({
  node: document.getElementById('app'),
  flags: null
});

// Set up ports for JavaScript interop if needed
// app.ports.somePort.subscribe((data) => {
//   // Handle port messages
// });
