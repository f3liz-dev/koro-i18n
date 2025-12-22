import './styles/minimal.css';
import { tpl, byId } from './ui';

async function renderLogin() {
  const main = byId('main');
  if (!main) return;
  main.innerHTML = '';
  main.appendChild(tpl('login-template'));
  const github = byId<HTMLAnchorElement>('github-auth');
  if (github) github.href = `${window.location.origin}/api/auth/github`;
}

void renderLogin();
