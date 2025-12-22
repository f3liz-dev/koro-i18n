import './styles/minimal.css';
import { tpl, byId, mustById } from './ui';
import { fetchProject, fetchProjectFiles, fetchFilesSummary, refreshProjectFiles } from './api';
import type { FileEntry, SummaryEntry } from './api';

async function renderProject() {
  const main = mustById('main');
  main.innerHTML = '';
  main.appendChild(tpl('project-shell-template'));

  const params = new URLSearchParams(window.location.search);
  const name = params.get('name');
  const title = byId('project-title');
  const desc = byId('project-description');
  const link = byId<HTMLAnchorElement>('project-translations-link');
  const content = byId('project-content');

  if (!name || !title || !desc || !link || !content) return;
  title.textContent = name;
  content.innerHTML = '';
  content.appendChild(tpl('project-loading-template'));
  link.href = `/editor.html?project=${encodeURIComponent(name)}`;

  try {
    const project = await fetchProject(name);
    desc.textContent = project?.description || project?.repository || '';

    // Fetch files and summary from backend (which reads from GitHub)
    try {
      const refreshBtn = document.createElement('button');
      refreshBtn.className = 'btn';
      refreshBtn.textContent = 'Refresh files from repository';
      refreshBtn.addEventListener('click', async () => {
        try {
          refreshBtn.disabled = true;
          refreshBtn.textContent = 'Refreshing...';
          await refreshProjectFiles(name);
          // Re-render the project to refresh lists
          void renderProject();
        } catch (e) {
          console.error('Failed to refresh files', e);
          alert('Failed to refresh files: ' + (e as Error).message);
        } finally {
          refreshBtn.disabled = false;
          refreshBtn.textContent = 'Refresh files from repository';
        }
      });
      content.innerHTML = '';
      content.appendChild(refreshBtn);

      const files = await fetchProjectFiles(name);
      const summary = await fetchFilesSummary(name);

      if (!files || files.length === 0) {
        content.appendChild(tpl('project-info-template'));
        return;
      }

      const grouped = new Map<string, FileEntry[]>();
      for (const f of files) {
        const arr = grouped.get(f.lang) || [];
        arr.push(f);
        grouped.set(f.lang, arr);
      }

      const container = document.createElement('div');
      container.className = 'grid gap-4';

      for (const [lang, items] of grouped) {
        const box = document.createElement('div');
        box.className = 'card p-4';
        const h = document.createElement('h3');
        h.className = 'font-bold mb-2';
        h.textContent = `${lang} (${items.length} files)`;
        box.appendChild(h);

        const list = document.createElement('ul');
        list.className = 'list-none';
        for (const it of items.sort((a,b)=>a.filename.localeCompare(b.filename))) {
          const li = document.createElement('li');
          li.className = 'mb-2 flex justify-between items-center';
          const left = document.createElement('div');
          const fileLink = document.createElement('a');
          fileLink.className = 'nav-link';
          fileLink.href = `/editor.html?project=${encodeURIComponent(name)}&language=${encodeURIComponent(it.lang)}&filename=${encodeURIComponent(it.filename)}`;
          fileLink.textContent = it.filename;
          left.appendChild(fileLink);
          li.appendChild(left);

          const meta = document.createElement('div');
          const s = (summary as any).files?.find((sf: SummaryEntry) => sf.filename === it.filename && sf.lang === it.lang);
          meta.textContent = s ? `${s.translationPercentage}% (${s.translatedKeys}/${s.totalKeys})` : '';
          li.appendChild(meta);
          list.appendChild(li);
        }

        box.appendChild(list);
        container.appendChild(box);
      }

      content.appendChild(container);
    } catch (e) {
      console.error('Failed to load files/summary', e);
      content.appendChild(tpl('project-info-template'));
    }
  } catch (err) {
    console.error('Failed to load project', err);
    content.innerHTML = '';
    content.appendChild(tpl('project-error-template'));
  }
}

void renderProject();
