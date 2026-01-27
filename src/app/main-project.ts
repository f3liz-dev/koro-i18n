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
    // Fetch project info first for immediate display
    const project = await fetchProject(name);
    desc.textContent = project?.description || project?.repository || '';

    // Create refresh button and controls
    const controls = document.createElement('div');
    controls.className = 'flex justify-between items-center mb-4 gap-3';
    
    const searchBox = document.createElement('input');
    searchBox.type = 'text';
    searchBox.placeholder = 'Search files...';
    searchBox.className = 'input';
    searchBox.style.maxWidth = '300px';
    
    const refreshBtn = document.createElement('button');
    refreshBtn.className = 'btn';
    refreshBtn.textContent = 'Refresh files';
    refreshBtn.addEventListener('click', async () => {
      try {
        refreshBtn.disabled = true;
        refreshBtn.textContent = 'Refreshing...';
        await refreshProjectFiles(name);
        void renderProject();
      } catch (e) {
        console.error('Failed to refresh files', e);
        alert('Failed to refresh files: ' + (e as Error).message);
      } finally {
        refreshBtn.disabled = false;
        refreshBtn.textContent = 'Refresh files';
      }
    });

    controls.appendChild(searchBox);
    controls.appendChild(refreshBtn);
    content.innerHTML = '';
    content.appendChild(controls);

    // Parallel fetch for better performance
    const [files, summary] = await Promise.all([
      fetchProjectFiles(name),
      fetchFilesSummary(name)
    ]);

    if (!files || files.length === 0) {
      content.appendChild(tpl('project-info-template'));
      return;
    }

    // Build summary lookup for O(1) access
    const summaryMap = new Map<string, SummaryEntry>();
    if ((summary as any).files) {
      for (const s of (summary as any).files as SummaryEntry[]) {
        summaryMap.set(`${s.lang}:${s.filename}`, s);
      }
    }

    const grouped = new Map<string, FileEntry[]>();
    for (const f of files) {
      const arr = grouped.get(f.lang) || [];
      arr.push(f);
      grouped.set(f.lang, arr);
    }

    const container = document.createElement('div');
    container.className = 'grid gap-4';
    container.id = 'files-container';

    // Sort languages for consistent ordering
    const sortedLangs = Array.from(grouped.keys()).sort();
    
    for (const lang of sortedLangs) {
      const items = grouped.get(lang)!;
      const box = document.createElement('div');
      box.className = 'card p-4 animate-slide-up cursor-pointer';
      box.dataset.language = lang;
      box.dataset.expanded = 'false';
      
      const header = document.createElement('div');
      header.className = 'flex justify-between items-center';
      
      const leftHeader = document.createElement('div');
      leftHeader.className = 'flex items-center gap-2';
      
      const expandIcon = document.createElement('span');
      expandIcon.className = 'expand-icon text-lg';
      expandIcon.textContent = '▶';
      expandIcon.style.transition = 'transform 0.2s';
      
      const h = document.createElement('h3');
      h.className = 'font-bold text-lg';
      h.textContent = `${lang}`;
      
      leftHeader.appendChild(expandIcon);
      leftHeader.appendChild(h);
      
      const langBadge = document.createElement('span');
      langBadge.className = 'badge neutral';
      langBadge.textContent = `${items.length} files`;
      
      header.appendChild(leftHeader);
      header.appendChild(langBadge);
      box.appendChild(header);

      const list = document.createElement('ul');
      list.className = 'space-y-2 mt-3';
      list.style.display = 'none';
      list.style.maxHeight = '0';
      list.style.overflow = 'hidden';
      list.style.transition = 'max-height 0.3s ease-out';
      
      for (const it of items.sort((a,b)=>a.filename.localeCompare(b.filename))) {
        const li = document.createElement('li');
        li.className = 'flex justify-between items-center p-2 rounded hover:bg-surface transition-all';
        li.dataset.filename = it.filename.toLowerCase();
        
        const left = document.createElement('div');
        left.className = 'flex-1 min-w-0';
        
        const fileLink = document.createElement('a');
        fileLink.className = 'nav-link font-medium';
        fileLink.href = `/editor.html?project=${encodeURIComponent(name)}&language=${encodeURIComponent(it.lang)}&filename=${encodeURIComponent(it.filename)}`;
        fileLink.textContent = it.filename;
        left.appendChild(fileLink);
        
        const meta = document.createElement('div');
        meta.className = 'flex items-center gap-2';
        
        const s = summaryMap.get(`${it.lang}:${it.filename}`);
        if (s) {
          const progressBar = document.createElement('div');
          progressBar.className = 'progress-bar';
          progressBar.style.width = '100px';
          
          const progressFill = document.createElement('div');
          progressFill.className = 'progress-fill';
          const gitPercentage = s.gitTranslationPercentage ?? s.translationPercentage;
          progressFill.style.width = `${gitPercentage}%`;
          
          if (gitPercentage >= 90) {
            progressFill.classList.add('success');
          } else if (gitPercentage >= 50) {
            progressFill.classList.add('warning');
          } else {
            progressFill.classList.add('danger');
          }
          
          progressBar.appendChild(progressFill);
          
          const percentText = document.createElement('span');
          percentText.className = 'text-sm text-secondary';
          percentText.title = 'Git translated percentage';
          percentText.textContent = `${gitPercentage}%`;
          
          const countText = document.createElement('span');
          countText.className = 'text-xs text-muted';
          const gitKeys = s.gitTranslatedKeys ?? s.translatedKeys;
          countText.title = `${gitKeys} keys in git, ${s.translatedKeys} total (including pending)`;
          countText.textContent = `${gitKeys}/${s.totalKeys}`;
          
          meta.appendChild(progressBar);
          meta.appendChild(percentText);
          meta.appendChild(countText);
        }
        
        li.appendChild(left);
        li.appendChild(meta);
        list.appendChild(li);
      }

      box.appendChild(list);
      
      // Add click handler to toggle expansion
      header.addEventListener('click', () => {
        const isExpanded = box.dataset.expanded === 'true';
        
        if (isExpanded) {
          // Collapse
          list.style.maxHeight = '0';
          setTimeout(() => {
            list.style.display = 'none';
          }, 300);
          expandIcon.style.transform = 'rotate(0deg)';
          box.dataset.expanded = 'false';
        } else {
          // Expand
          list.style.display = 'block';
          list.style.maxHeight = list.scrollHeight + 'px';
          expandIcon.style.transform = 'rotate(90deg)';
          box.dataset.expanded = 'true';
        }
      });
      
      container.appendChild(box);
    }

    content.appendChild(container);

    // Add search functionality
    searchBox.addEventListener('input', (e) => {
      const query = (e.target as HTMLInputElement).value.toLowerCase();
      const languageBoxes = container.querySelectorAll<HTMLElement>('[data-language]');
      
      languageBoxes.forEach(box => {
        const items = box.querySelectorAll<HTMLElement>('li[data-filename]');
        const list = box.querySelector('ul') as HTMLElement;
        const expandIcon = box.querySelector('.expand-icon') as HTMLElement;
        let visibleCount = 0;
        
        items.forEach(item => {
          const filename = item.dataset.filename || '';
          if (!query || filename.includes(query)) {
            item.style.display = '';
            visibleCount++;
          } else {
            item.style.display = 'none';
          }
        });
        
        // Auto-expand if search has matches, hide if no matches
        if (visibleCount > 0) {
          box.style.display = '';
          if (query) {
            // Auto-expand when searching
            list.style.display = 'block';
            list.style.maxHeight = list.scrollHeight + 'px';
            expandIcon.style.transform = 'rotate(90deg)';
            box.dataset.expanded = 'true';
          }
        } else {
          box.style.display = 'none';
        }
      });
    });
  } catch (err) {
    console.error('Failed to load project', err);
    content.innerHTML = '';
    content.appendChild(tpl('project-error-template'));
  }
}

void renderProject();
