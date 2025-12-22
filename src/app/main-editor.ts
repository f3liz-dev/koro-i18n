import './styles/minimal.css';
import { tpl, byId } from './ui';
import { fetchTranslationFile, submitTranslation, approveTranslation, deleteTranslation } from './api';
import type { TranslationFileData } from './api';

function renderEditor() {
  const main = byId('main');
  if (!main) return;
  main.innerHTML = '';
  main.appendChild(tpl('editor-shell-template'));

  const params = new URLSearchParams(window.location.search);
  const project = params.get('project');
  const filenameParam = params.get('filename');
  const languageParam = params.get('language');
  const title = byId('editor-title');
  const subtitle = byId('editor-subtitle');
  const back = byId<HTMLAnchorElement>('editor-back-link');
  const content = byId('content-area');

  if (title) title.textContent = 'Editor';
  if (subtitle) subtitle.textContent = project ? `Project: ${project}` : '';
  if (back && project) back.href = `/project.html?name=${encodeURIComponent(project)}`;

  if (content) {
    content.innerHTML = '';
    // Improved editor: focus on one key at a time with a sidebar list
    if (project && languageParam && filenameParam) {
      const loading = document.createElement('div');
      loading.className = 'flex justify-center p-8';
      loading.innerHTML = '<div class="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>';
      content.appendChild(loading);

      const proj = project as string;
      const lang = languageParam as string;
      const file = filenameParam as string;
      fetchTranslationFile(proj, lang, file)
        .then((data: TranslationFileData) => {
          content.innerHTML = '';

          const header = document.createElement('div');
          header.className = 'mb-4 flex justify-between items-center';
          const title = document.createElement('div');
          title.innerHTML = `<strong>${filenameParam}</strong> — ${languageParam}`;
          header.appendChild(title);
          const back = document.createElement('a');
          back.href = `/project.html?name=${encodeURIComponent(project)}`;
          back.className = 'btn ghost';
          back.textContent = 'Back';
          header.appendChild(back);
          content.appendChild(header);

          // Build maps
          const pendingByKey = new Map<string, any[]>();
          for (const p of data.pending || []) {
            const arr = pendingByKey.get(p.key) || [];
            arr.push(p);
            pendingByKey.set(p.key, arr);
          }
          const approvedByKey = new Map<string, any[]>();
          for (const a of data.approved || []) {
            const arr = approvedByKey.get(a.key) || [];
            arr.push(a);
            approvedByKey.set(a.key, arr);
          }

          const keys = Object.keys(data.source).sort();
          if (keys.length === 0) {
            content.appendChild(tpl('editor-info-template'));
            return;
          }

          // Layout: sidebar list + focus panel
          const wrapper = document.createElement('div');
          wrapper.className = 'flex gap-4';

          const sidebar = document.createElement('div');
          sidebar.className = 'card p-4';
          sidebar.style.width = '34%';
          const search = document.createElement('input');
          search.className = 'input mb-4';
          search.placeholder = 'Filter keys...';
          sidebar.appendChild(search);

          const list = document.createElement('div');
          list.style.maxHeight = '60vh';
          list.style.overflow = 'auto';
          sidebar.appendChild(list);

          const panel = document.createElement('div');
          panel.className = 'card p-4';
          panel.style.flex = '1';

          wrapper.appendChild(sidebar);
          wrapper.appendChild(panel);
          content.appendChild(wrapper);

          let filteredKeys = keys.slice();
          let currentIndex = 0;

          function renderList() {
            list.innerHTML = '';
            filteredKeys.forEach((k, idx) => {
              const btn = document.createElement('button');
              btn.className = 'btn ghost w-full text-left mb-2';
              btn.textContent = k;
              if (idx === currentIndex) btn.classList.add('selected');
              btn.addEventListener('click', () => {
                currentIndex = idx;
                renderPanel();
                renderList();
              });
              list.appendChild(btn);
            });
          }

          function navigate(offset: number) {
            if (filteredKeys.length === 0) return;
            currentIndex = Math.max(0, Math.min(filteredKeys.length - 1, currentIndex + offset));
            renderPanel();
            renderList();
            // ensure visible
            const btns = list.querySelectorAll('button');
            const el = btns[currentIndex] as HTMLElement | undefined;
            if (el) el.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
          }

          function renderPanel() {
            // cleanup previous listeners
            if ((panel as any)._cleanup) (panel as any)._cleanup();
            const key = filteredKeys[currentIndex];
            panel.innerHTML = '';

            const keyHeader = document.createElement('div');
            keyHeader.className = 'mb-2';
            keyHeader.innerHTML = `<h2 class="font-bold">${key}</h2>`;
            panel.appendChild(keyHeader);

            const src = document.createElement('div');
            src.className = 'mb-4 text-sm text-secondary';
            src.textContent = data.source[key] ?? '';
            panel.appendChild(src);

            const repoLabel = document.createElement('div');
            repoLabel.className = 'label';
            repoLabel.textContent = 'Repository value';
            panel.appendChild(repoLabel);
            const repoVal = document.createElement('div');
            repoVal.className = 'mb-4';
            repoVal.textContent = data.target[key] ?? '';
            panel.appendChild(repoVal);

            const editorLabel = document.createElement('div');
            editorLabel.className = 'label';
            editorLabel.textContent = 'Your suggestion';
            panel.appendChild(editorLabel);

            const textarea = document.createElement('textarea');
            textarea.className = 'input';
            textarea.style.width = '100%';
            textarea.value = (pendingByKey.get(key)?.[0]?.value) ?? data.target[key] ?? '';
            textarea.placeholder = 'Enter translation suggestion...';
            panel.appendChild(textarea);

            // Focus textarea for quick editing
            setTimeout(() => {
              textarea.focus();
              // move cursor to end
              textarea.selectionStart = textarea.selectionEnd = textarea.value.length;
            }, 50);

            const controls = document.createElement('div');
            controls.className = 'flex gap-2 mt-4';

            const submit = document.createElement('button');
            submit.className = 'btn primary';
            submit.textContent = 'Submit suggestion (Ctrl+Enter)';
            controls.appendChild(submit);

            const prev = document.createElement('button');
            prev.className = 'btn ghost';
            prev.textContent = 'Prev (k)';
            controls.appendChild(prev);

            const next = document.createElement('button');
            next.className = 'btn ghost';
            next.textContent = 'Next (j)';
            controls.appendChild(next);

            const focusToggle = document.createElement('button');
            focusToggle.className = 'btn ghost';
            focusToggle.textContent = 'Focus mode';
            controls.appendChild(focusToggle);

            panel.appendChild(controls);

            // Pending list
            const pendingList = pendingByKey.get(key) || [];
            if (pendingList.length > 0) {
              const pl = document.createElement('div');
              pl.className = 'mt-4';
              pl.innerHTML = '<div class="label">Pending suggestions</div>';
              for (const p of pendingList) {
                const pRow = document.createElement('div');
                pRow.className = 'flex items-center gap-2 mt-2';
                const t = document.createElement('div');
                t.textContent = `${p.value} (by ${p.username || 'unknown'})`;
                pRow.appendChild(t);

                const approve = document.createElement('button');
                approve.className = 'btn success small';
                approve.textContent = 'Approve';
                pRow.appendChild(approve);

                const reject = document.createElement('button');
                reject.className = 'btn ghost small';
                reject.textContent = 'Reject';
                pRow.appendChild(reject);

                const del = document.createElement('button');
                del.className = 'btn danger small';
                del.textContent = 'Delete';
                pRow.appendChild(del);

                pl.appendChild(pRow);

                approve.addEventListener('click', async () => {
                  try {
              approve.disabled = true;
              await approveTranslation(proj, p.id, 'approved');
                    await refreshData();
                  } catch (e) {
                    alert('Failed to approve: ' + (e as Error).message);
                  } finally {
                    approve.disabled = false;
                  }
                });

                reject.addEventListener('click', async () => {
                  try {
                    reject.disabled = true;
                    await approveTranslation(proj, p.id, 'rejected');
                    await refreshData();
                  } catch (e) {
                    alert('Failed to reject: ' + (e as Error).message);
                  } finally {
                    reject.disabled = false;
                  }
                });

                del.addEventListener('click', async () => {
                  if (!confirm('Delete this suggestion?')) return;
                  try {
                    del.disabled = true;
                    await deleteTranslation(proj, p.id);
                    await refreshData();
                  } catch (e) {
                    alert('Failed to delete suggestion: ' + (e as Error).message);
                  } finally {
                    del.disabled = false;
                  }
                });
              }
              panel.appendChild(pl);
            }

            // Handlers
            submit.addEventListener('click', async () => {
              try {
                submit.disabled = true;
                submit.textContent = 'Submitting...';
                await submitTranslation(proj, lang, file, key, textarea.value);
                await refreshData();
              } catch (e) {
                alert('Failed to submit: ' + (e as Error).message);
              } finally {
                submit.disabled = false;
                submit.textContent = 'Submit suggestion (Ctrl+Enter)';
              }
            });

            prev.addEventListener('click', () => navigate(-1));
            next.addEventListener('click', () => navigate(1));

            let focusedOnly = false;
            focusToggle.addEventListener('click', () => {
              focusedOnly = !focusedOnly;
              if (focusedOnly) {
                sidebar.style.display = 'none';
                focusToggle.textContent = 'Exit focus';
              } else {
                sidebar.style.display = 'block';
                focusToggle.textContent = 'Focus mode';
              }
            });

            // Keyboard shortcuts
            const keyHandler = (e: KeyboardEvent) => {
              const key = (e.key || '').toString().toLowerCase();

              // Allow Ctrl/Cmd+Enter to submit even when focus is inside the textarea
              if ((e.ctrlKey || e.metaKey) && key === 'enter') {
                e.preventDefault();
                submit.click();
                return;
              }

              // Don't intercept navigation keys while the user is typing in inputs or textareas
              const active = document.activeElement as HTMLElement | null;
              const isTyping = !!active && (
                active.tagName === 'INPUT' ||
                active.tagName === 'TEXTAREA' ||
                (active as HTMLElement).isContentEditable
              );
              if (isTyping) return;

              if (key === 'j') { e.preventDefault(); navigate(1); }
              if (key === 'k') { e.preventDefault(); navigate(-1); }
              if (key === 'escape') { textarea.blur(); sidebar.style.display = 'block'; focusedOnly = false; focusToggle.textContent = 'Focus mode'; }
            };
            document.addEventListener('keydown', keyHandler);
            // cleanup on re-render by returning handler to be removable
            (panel as any)._cleanup = () => document.removeEventListener('keydown', keyHandler);
          }

          async function refreshData() {
            try {
              const refreshed = await fetchTranslationFile(proj, lang, file);
              // update data and rebuild maps
              Object.assign(data, refreshed);
              // recreate maps and filtered keys
              // rebuild pending/approved maps
              // simple approach: call renderList/renderPanel from scratch
              const newKeys = Object.keys(data.source).sort();
              filteredKeys = newKeys.filter(k => (search.value ? k.includes(search.value) : true));
              if (currentIndex >= filteredKeys.length) currentIndex = Math.max(0, filteredKeys.length - 1);
              // re-render
              renderList();
              // cleanup possible old keydown listener
              if ((panel as any)._cleanup) (panel as any)._cleanup();
              renderPanel();
            } catch (e) {
              console.error('Failed to refresh data', e);
            }
          }

          // initial render
          renderList();
          renderPanel();

          // search
          search.addEventListener('input', () => {
            const q = search.value.trim();
            filteredKeys = keys.filter(k => k.includes(q));
            currentIndex = 0;
            renderList();
            renderPanel();
          });
        })
        .catch((e) => {
          console.error('Failed to load translation file', e);
          content.appendChild(tpl('editor-info-template'));
        });
    } else {
      content.appendChild(tpl('editor-info-template'));
    }
  }
}

void renderEditor();
