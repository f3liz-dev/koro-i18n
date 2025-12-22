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
    // If a filename and language are provided, load the file
    if (project && languageParam && filenameParam) {
      const loading = document.createElement('div');
      loading.className = 'flex justify-center p-8';
      loading.innerHTML = '<div class="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>';
      content.appendChild(loading);

      fetchTranslationFile(project, languageParam, filenameParam)
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

          const table = document.createElement('table');
          table.className = 'w-full';
          const thead = document.createElement('thead');
          thead.innerHTML = '<tr><th class="text-left">Key</th><th class="text-left">Source</th><th class="text-left">Target</th><th class="text-left">Actions</th></tr>';
          table.appendChild(thead);
          const tbody = document.createElement('tbody');

          // Build quick lookup maps for pending and approved translations
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
          for (const key of keys) {
            const tr = document.createElement('tr');
            // Key
            const tdKey = document.createElement('td');
            tdKey.textContent = key;

            // Source
            const tdSrc = document.createElement('td');
            tdSrc.textContent = data.source[key] ?? '';

            // Target cell (editable)
            const tdTgt = document.createElement('td');
            const targetValue = data.target[key] ?? '';
            const targetDiv = document.createElement('div');
            targetDiv.textContent = targetValue;
            tdTgt.appendChild(targetDiv);

            // Actions cell
            const tdActions = document.createElement('td');
            tdActions.className = 'space-x-2';

            // Edit/Suggest button
            const editBtn = document.createElement('button');
            editBtn.className = 'btn ghost';
            editBtn.textContent = 'Suggest';
            editBtn.addEventListener('click', () => {
              // Replace targetDiv with textarea + save/cancel
              const textarea = document.createElement('textarea');
              textarea.className = 'input';
              textarea.style.width = '100%';
              textarea.value = targetValue || '';

              const saveBtn = document.createElement('button');
              saveBtn.className = 'btn';
              saveBtn.textContent = 'Submit';

              const cancelBtn = document.createElement('button');
              cancelBtn.className = 'btn ghost';
              cancelBtn.textContent = 'Cancel';

              const controls = document.createElement('div');
              controls.className = 'flex gap-2 mt-2';
              controls.appendChild(saveBtn);
              controls.appendChild(cancelBtn);

              tdTgt.innerHTML = '';
              tdTgt.appendChild(textarea);
              tdTgt.appendChild(controls);

              cancelBtn.addEventListener('click', () => {
                tdTgt.innerHTML = '';
                tdTgt.appendChild(targetDiv);
              });

              saveBtn.addEventListener('click', async () => {
                try {
                  saveBtn.disabled = true;
                  saveBtn.textContent = 'Submitting...';
                  await submitTranslation(project, languageParam, filenameParam, key, textarea.value);
                  setTimeout(() => renderEditor(), 100);
                } catch (e) {
                  console.error('Failed to submit translation', e);
                  alert('Failed to submit translation: ' + (e as Error).message);
                } finally {
                  saveBtn.disabled = false;
                  saveBtn.textContent = 'Submit';
                }
              });
            });

            tdActions.appendChild(editBtn);

            // Show approved translations (if any)
            const approved = approvedByKey.get(key) || [];
            if (approved.length > 0) {
              const aList = document.createElement('div');
              aList.className = 'mt-2 text-sm text-green-700';
              for (const a of approved) {
                const aItem = document.createElement('div');
                aItem.textContent = `Approved: ${a.value} (by ${a.username || 'unknown'})`;
                aList.appendChild(aItem);
              }
              tdActions.appendChild(aList);
            }

            // Show pending translations with moderation controls
            const pending = pendingByKey.get(key) || [];
            if (pending.length > 0) {
              const pList = document.createElement('div');
              pList.className = 'mt-2 text-sm';
              for (const p of pending) {
                const pItem = document.createElement('div');
                pItem.className = 'flex items-center gap-2';
                const txt = document.createElement('span');
                txt.textContent = `${p.value} (by ${p.username || 'unknown'})`;
                pItem.appendChild(txt);

                const approve = document.createElement('button');
                approve.className = 'btn success small';
                approve.textContent = 'Approve';
                approve.addEventListener('click', async () => {
                  try {
                    approve.disabled = true;
                    approve.textContent = 'Approving...';
                    await approveTranslation(project, p.id, 'approved');
                    setTimeout(() => renderEditor(), 100);
                  } catch (e) {
                    console.error('Failed to approve', e);
                    alert('Failed to approve: ' + (e as Error).message);
                  } finally {
                    approve.disabled = false;
                    approve.textContent = 'Approve';
                  }
                });

                const reject = document.createElement('button');
                reject.className = 'btn ghost small';
                reject.textContent = 'Reject';
                reject.addEventListener('click', async () => {
                  try {
                    reject.disabled = true;
                    reject.textContent = 'Rejecting...';
                    await approveTranslation(project, p.id, 'rejected');
                    setTimeout(() => renderEditor(), 100);
                  } catch (e) {
                    console.error('Failed to reject', e);
                    alert('Failed to reject: ' + (e as Error).message);
                  } finally {
                    reject.disabled = false;
                    reject.textContent = 'Reject';
                  }
                });

                const del = document.createElement('button');
                del.className = 'btn danger small';
                del.textContent = 'Delete';
                del.addEventListener('click', async () => {
                  if (!confirm('Delete this suggestion?')) return;
                  try {
                    del.disabled = true;
                    await deleteTranslation(project, p.id);
                    setTimeout(() => renderEditor(), 100);
                  } catch (e) {
                    console.error('Failed to delete suggestion', e);
                    alert('Failed to delete suggestion: ' + (e as Error).message);
                  } finally {
                    del.disabled = false;
                  }
                });

                const controls = document.createElement('div');
                controls.className = 'flex gap-2 ml-2';
                controls.appendChild(approve);
                controls.appendChild(reject);
                controls.appendChild(del);
                pItem.appendChild(controls);

                pList.appendChild(pItem);
              }
              tdActions.appendChild(pList);
            }

            tr.appendChild(tdKey);
            tr.appendChild(tdSrc);
            tr.appendChild(tdTgt);
            tr.appendChild(tdActions);
            tbody.appendChild(tr);
          }

          table.appendChild(tbody);
          content.appendChild(table);
        })
        .catch((e) => {
          console.error('Failed to load translation file', e);
          content.appendChild(tpl('editor-info-template'));
        });
    } else {
      // Show a short guide for using editor
      content.appendChild(tpl('editor-info-template'));
    }
  }
}

void renderEditor();
