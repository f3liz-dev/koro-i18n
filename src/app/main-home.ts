import './styles/minimal.css';
import { tpl, byId } from './ui';

async function renderHome() {
  const main = byId('main');
  if (!main) return;
  main.innerHTML = '';
  main.appendChild(tpl('home-template'));
}

void renderHome();
