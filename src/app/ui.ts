import { Project } from './api';

// Small DOM helpers --------------------------------------------------------
export function tpl(id: string): DocumentFragment {
  const el = document.getElementById(id) as HTMLTemplateElement | null;
  if (!el) throw new Error(`Template ${id} not found`);
  return el.content.cloneNode(true) as DocumentFragment;
}

export function byId<T extends HTMLElement = HTMLElement>(id: string): T | null {
  return document.getElementById(id) as T | null;
}

export function mustById<T extends HTMLElement = HTMLElement>(id: string): T {
  const el = byId<T>(id);
  if (!el) throw new Error(`Element ${id} not found`);
  return el;
}

// Small utility to create a project card element
export function createProjectCard(p: Project): HTMLAnchorElement {
  const card = document.createElement('a');
  card.href = `/project.html?name=${encodeURIComponent(p.name)}`;
  card.className = 'card interactive project-card';
  card.innerHTML = `
    <h3 class="font-bold mb-2">${p.name}</h3>
    <p class="text-sm text-secondary mb-4">${p.description || p.repository || ''}</p>
    <div class="flex justify-between items-center">
      <span class="badge success">Active</span>
      ${p.role ? `<span class="badge neutral">${p.role}</span>` : ''}
    </div>
  `;
  return card;
}

export default {};
