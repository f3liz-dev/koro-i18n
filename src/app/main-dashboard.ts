import './styles/minimal.css';
import { tpl, byId, mustById, createProjectCard } from './ui';
import { fetchProjects } from './api';

async function renderDashboard() {
  const main = mustById('main');
  main.innerHTML = '';
  main.appendChild(tpl('dashboard-shell-template'));

  const content = byId('dashboard-content');
  if (!content) return;
  content.innerHTML = '';
  content.appendChild(tpl('dashboard-loading-template'));

  try {
    const projects = await fetchProjects();
    content.innerHTML = '';
    if (!projects || projects.length === 0) {
      content.appendChild(tpl('dashboard-empty-template'));
      return;
    }

    const grid = document.createElement('div');
    grid.className = 'grid grid-3 gap-6';
    for (const p of projects) {
      grid.appendChild(createProjectCard(p));
    }
    content.appendChild(grid);
  } catch (err) {
    console.error('Failed to load projects', err);
    content.innerHTML = '';
    content.appendChild(tpl('dashboard-error-template'));
  }
}

void renderDashboard();
