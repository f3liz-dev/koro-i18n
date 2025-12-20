/**
 * Koro i18n Frontend
 * A lightweight vanilla JavaScript SPA for translation management
 */

import './styles/minimal.css';

// ============================================================================
// Configuration
// ============================================================================

const API_BASE = '/api';

// ============================================================================
// State Management
// ============================================================================

const state = {
  auth: {
    status: 'checking', // 'checking' | 'loggedIn' | 'loggedOut'
    user: null
  },
  currentPath: window.location.pathname
};

// ============================================================================
// API Client
// ============================================================================

async function apiFetch(url, options = {}) {
  try {
    const response = await fetch(url, {
      ...options,
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      }
    });

    if (response.status === 401) {
      state.auth = { status: 'loggedOut', user: null };
      navigate('/login');
      return null;
    }

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Request failed' }));
      throw new Error(error.error || 'Request failed');
    }

    return response.json();
  } catch (error) {
    console.error('API error:', error);
    throw error;
  }
}

// ============================================================================
// Router
// ============================================================================

function navigate(path) {
  window.history.pushState({}, '', path);
  state.currentPath = path;
  render();
}

function parseRoute(path) {
  // Match routes with parameters
  const routes = [
    { pattern: /^\/$/, name: 'home', params: {} },
    { pattern: /^\/login$/, name: 'login', params: {} },
    { pattern: /^\/dashboard$/, name: 'dashboard', params: {} },
    { pattern: /^\/projects\/new$/, name: 'createProject', params: {} },
    { pattern: /^\/projects\/([^/]+)\/translations\/([^/]+)\/editor$/, name: 'translationEditor', extract: ['projectName', 'language'] },
    { pattern: /^\/projects\/([^/]+)\/translations$/, name: 'translations', extract: ['projectName'] },
    { pattern: /^\/projects\/([^/]+)$/, name: 'projectView', extract: ['projectName'] },
  ];

  for (const route of routes) {
    const match = path.match(route.pattern);
    if (match) {
      const params = {};
      if (route.extract) {
        route.extract.forEach((key, i) => {
          params[key] = decodeURIComponent(match[i + 1]);
        });
      }
      return { name: route.name, params };
    }
  }

  return { name: 'notFound', params: {} };
}

// ============================================================================
// HTML Helpers
// ============================================================================

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function setInnerHTML(element, html) {
  element.innerHTML = html;
}

// ============================================================================
// Components
// ============================================================================

function renderNav() {
  const nav = document.getElementById('nav');
  if (!nav) return;

  if (state.auth.status === 'loggedIn' && state.auth.user) {
    nav.innerHTML = `
      <a href="/dashboard">Dashboard</a>
      <span class="text-sm text-secondary">${escapeHtml(state.auth.user.username)}</span>
    `;
  } else if (state.auth.status === 'loggedOut') {
    nav.innerHTML = `<a href="/login">Login</a>`;
  } else {
    nav.innerHTML = '';
  }

  // Handle nav link clicks
  nav.querySelectorAll('a').forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      navigate(link.getAttribute('href'));
    });
  });
}

function renderLoading() {
  return `
    <div class="flex justify-center p-8">
      <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
    </div>
  `;
}

function renderError(message) {
  return `<div class="message error">${escapeHtml(message)}</div>`;
}

function renderEmptyState(icon, title, description) {
  return `
    <div class="empty-state">
      <div class="icon">${icon}</div>
      <h3 class="title">${escapeHtml(title)}</h3>
      <p class="description">${escapeHtml(description)}</p>
    </div>
  `;
}

// ============================================================================
// Pages
// ============================================================================

function renderHomePage() {
  return `
    <div class="flex flex-col items-center justify-center space-y-4" style="min-height: 60vh;">
      <h1 class="text-4xl font-bold" style="font-size: 2.5rem;">Welcome to Koro i18n</h1>
      <p class="text-lg text-secondary max-w-lg text-center">
        A lightweight translation management platform. Translate your applications with ease.
      </p>
      <div class="flex gap-4 mt-6">
        <a href="/login" class="btn primary lg">Get Started</a>
        <a href="https://github.com/f3liz-dev/koro-i18n" target="_blank" class="btn ghost lg">View on GitHub</a>
      </div>
    </div>
  `;
}

function renderLoginPage() {
  const backendUrl = window.location.origin;
  
  return `
    <div class="flex items-center justify-center" style="min-height: 60vh;">
      <div class="card max-w-md w-full">
        <h2 class="text-2xl font-bold mb-6 text-center">Sign in to your account</h2>
        <div class="flex flex-col gap-4">
          <a href="${backendUrl}/api/auth/github" class="btn primary w-full justify-center">
            Sign in with GitHub
          </a>
        </div>
      </div>
    </div>
  `;
}

async function renderDashboardPage() {
  const main = document.getElementById('main');
  
  // Initial render with loading
  main.innerHTML = `
    <div class="flex justify-between items-center mb-8">
      <h1 class="text-2xl font-bold">Dashboard</h1>
      <a href="/projects/new" class="btn primary" id="new-project-btn">New Project</a>
    </div>
    ${renderLoading()}
  `;

  // Attach event listener for new project button
  document.getElementById('new-project-btn')?.addEventListener('click', (e) => {
    e.preventDefault();
    navigate('/projects/new');
  });

  try {
    const data = await apiFetch(`${API_BASE}/projects`);
    const projects = data?.projects || [];

    let content;
    if (projects.length === 0) {
      content = renderEmptyState('📂', 'No projects yet', 'Create your first project to start translating.');
    } else {
      content = `
        <div class="grid grid-3 gap-6">
          ${projects.map(project => `
            <a href="/projects/${encodeURIComponent(project.name)}" class="card interactive project-card">
              <h3 class="font-bold mb-2">${escapeHtml(project.name)}</h3>
              <p class="text-sm text-secondary mb-4">${escapeHtml(project.description || project.repository || '')}</p>
              <div class="flex justify-between items-center">
                <span class="badge success">Active</span>
                ${project.role ? `<span class="badge neutral">${escapeHtml(project.role)}</span>` : ''}
              </div>
            </a>
          `).join('')}
        </div>
      `;
    }

    // Update content area only
    const loadingEl = main.querySelector('.flex.justify-center');
    if (loadingEl) {
      const contentDiv = document.createElement('div');
      contentDiv.innerHTML = content;
      loadingEl.replaceWith(...contentDiv.childNodes);
    }

    // Attach event listeners to project cards
    main.querySelectorAll('.project-card').forEach(card => {
      card.addEventListener('click', (e) => {
        e.preventDefault();
        navigate(card.getAttribute('href'));
      });
    });

  } catch (error) {
    const loadingEl = main.querySelector('.flex.justify-center');
    if (loadingEl) {
      loadingEl.outerHTML = renderError('Failed to load projects. Please try again.');
    }
  }
}

function renderCreateProjectPage() {
  return `
    <div class="flex justify-center">
      <div class="card max-w-lg w-full">
        <h1 class="text-2xl font-bold mb-6">Create New Project</h1>
        <form id="create-project-form" class="flex flex-col gap-4">
          <div>
            <label class="label">Project Name</label>
            <input type="text" class="input" id="project-name" placeholder="e.g., my-awesome-app" required />
            <p class="label-hint">Use letters, numbers, dashes, or underscores</p>
          </div>
          <div>
            <label class="label">GitHub Repository</label>
            <input type="text" class="input" id="project-repo" placeholder="owner/repo" required />
            <p class="label-hint">The GitHub repository to sync translations with</p>
          </div>
          <div>
            <label class="label">Description</label>
            <textarea class="input" id="project-description" placeholder="Brief description of the project" rows="3"></textarea>
          </div>
          <div id="form-error"></div>
          <div class="flex justify-end gap-3 mt-4">
            <a href="/dashboard" class="btn ghost" id="cancel-btn">Cancel</a>
            <button type="submit" class="btn primary" id="submit-btn">Create Project</button>
          </div>
        </form>
      </div>
    </div>
  `;
}

function setupCreateProjectForm() {
  const form = document.getElementById('create-project-form');
  const cancelBtn = document.getElementById('cancel-btn');
  const submitBtn = document.getElementById('submit-btn');
  const errorDiv = document.getElementById('form-error');

  cancelBtn?.addEventListener('click', (e) => {
    e.preventDefault();
    navigate('/dashboard');
  });

  form?.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const name = document.getElementById('project-name').value.trim();
    const repository = document.getElementById('project-repo').value.trim();
    const description = document.getElementById('project-description').value.trim();

    // Validation
    if (!name.match(/^[a-zA-Z0-9_-]+$/)) {
      errorDiv.innerHTML = renderError('Project name can only contain letters, numbers, dashes, and underscores');
      return;
    }

    if (!repository.match(/^[a-zA-Z0-9_-]+\/[a-zA-Z0-9_.-]+$/)) {
      errorDiv.innerHTML = renderError('Repository must be in owner/repo format');
      return;
    }

    submitBtn.disabled = true;
    submitBtn.textContent = 'Creating...';
    errorDiv.innerHTML = '';

    try {
      await apiFetch(`${API_BASE}/projects`, {
        method: 'POST',
        body: JSON.stringify({ name, repository, description })
      });
      navigate('/dashboard');
    } catch (error) {
      errorDiv.innerHTML = renderError(error.message || 'Failed to create project');
      submitBtn.disabled = false;
      submitBtn.textContent = 'Create Project';
    }
  });
}

async function renderProjectViewPage(projectName) {
  const main = document.getElementById('main');
  
  main.innerHTML = `
    <div class="flex justify-between items-center mb-6">
      <div>
        <h1 class="text-2xl font-bold">Project: ${escapeHtml(projectName)}</h1>
        <p class="text-sm text-secondary" id="project-description"></p>
      </div>
      <div class="flex gap-2">
        <a href="/projects/${encodeURIComponent(projectName)}/translations" class="btn ghost nav-link">Translations</a>
      </div>
    </div>
    ${renderLoading()}
  `;

  // Attach nav link handlers
  main.querySelectorAll('.nav-link').forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      navigate(link.getAttribute('href'));
    });
  });

  try {
    const data = await apiFetch(`${API_BASE}/projects`);
    const project = data?.projects?.find(p => p.name === projectName);

    const loadingEl = main.querySelector('.flex.justify-center');
    
    if (!project) {
      loadingEl.outerHTML = renderEmptyState('📂', 'Project not found', 'This project may have been deleted or you may not have access.');
      return;
    }

    document.getElementById('project-description').textContent = project.description || project.repository || '';

    loadingEl.outerHTML = `
      <div class="card">
        <h3 class="font-bold mb-4">Project Information</h3>
        <div class="space-y-3">
          <p><strong>Repository:</strong> ${escapeHtml(project.repository || project.name)}</p>
          ${project.role ? `<p><strong>Your Role:</strong> ${escapeHtml(project.role)}</p>` : ''}
        </div>
      </div>
    `;

  } catch (error) {
    const loadingEl = main.querySelector('.flex.justify-center');
    loadingEl.outerHTML = renderError('Failed to load project');
  }
}

async function renderTranslationsPage(projectName, language, filename) {
  const main = document.getElementById('main');
  const searchParams = new URLSearchParams(window.location.search);
  const filenameParam = filename || searchParams.get('filename') || '';

  // Determine what view to show
  const showEditor = language && filenameParam;
  const showFiles = language && !filenameParam;
  const showLanguages = !language;

  let title = 'Languages';
  if (showFiles) title = `Files for ${language}`;
  if (showEditor) title = `Translating ${filenameParam}`;

  main.innerHTML = `
    <div class="flex justify-between items-center mb-6">
      <div>
        <h1 class="text-2xl font-bold">${escapeHtml(title)}</h1>
        <p class="text-sm text-secondary">${escapeHtml(projectName)}${language ? ` • ${escapeHtml(language)}` : ''}</p>
      </div>
      <div class="flex gap-2">
        <a href="/projects/${encodeURIComponent(projectName)}" class="btn ghost nav-link">Back to Project</a>
      </div>
    </div>
    <div class="mb-6">
      <input type="text" class="input" id="filter-input" placeholder="Search keys or translations..." />
    </div>
    <div id="content-area">
      ${renderLoading()}
    </div>
  `;

  // Nav link handlers
  main.querySelectorAll('.nav-link').forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      navigate(link.getAttribute('href'));
    });
  });

  const contentArea = document.getElementById('content-area');
  const filterInput = document.getElementById('filter-input');

  try {
    if (showEditor) {
      // Fetch translation data for the file
      const data = await apiFetch(`${API_BASE}/projects/${encodeURIComponent(projectName)}/translations/file/${encodeURIComponent(language)}/${encodeURIComponent(filenameParam)}`);
      
      const source = data?.source || {};
      const target = data?.target || {};
      const pending = data?.pending || [];
      const approved = data?.approved || [];

      // Build translations array
      const translations = Object.entries(source).map(([key, sourceValue]) => ({
        key,
        sourceValue,
        currentValue: target[key] || '',
        hasPending: pending.some(p => p.key === key),
        hasApproved: approved.some(a => a.key === key)
      }));

      renderTranslationEditor(contentArea, translations, projectName, language, filenameParam, filterInput);
      
    } else {
      // Fetch counts
      const countsUrl = showLanguages 
        ? `${API_BASE}/projects/${encodeURIComponent(projectName)}/translations/counts`
        : `${API_BASE}/projects/${encodeURIComponent(projectName)}/translations/counts?language=${encodeURIComponent(language)}`;
      
      const data = await apiFetch(countsUrl);
      const counts = data?.counts || [];

      if (showLanguages) {
        // Show unique languages
        const languages = [...new Set(counts.map(c => c.language))];
        
        if (languages.length === 0) {
          contentArea.innerHTML = renderEmptyState('🌐', 'No languages found', 'No translation data available yet.');
        } else {
          contentArea.innerHTML = `
            <div class="grid gap-4">
              ${languages.map(lang => `
                <div class="card">
                  <a href="/projects/${encodeURIComponent(projectName)}/translations/${encodeURIComponent(lang)}/editor" class="nav-link font-bold">${escapeHtml(lang)}</a>
                  <p class="text-sm text-secondary">${counts.filter(c => c.language === lang).reduce((sum, c) => sum + c.count, 0)} translations</p>
                </div>
              `).join('')}
            </div>
          `;
        }
      } else {
        // Show files for this language
        const files = counts.filter(c => c.language === language).map(c => c.filename);
        const uniqueFiles = [...new Set(files)];
        
        if (uniqueFiles.length === 0) {
          contentArea.innerHTML = renderEmptyState('📁', `No files found for ${language}`, 'No translation files available.');
        } else {
          contentArea.innerHTML = `
            <div class="grid gap-4">
              ${uniqueFiles.map(file => {
                const count = counts.find(c => c.language === language && c.filename === file)?.count || 0;
                return `
                  <div class="card">
                    <a href="/projects/${encodeURIComponent(projectName)}/translations/${encodeURIComponent(language)}/editor?filename=${encodeURIComponent(file)}" class="nav-link font-bold">${escapeHtml(file)}</a>
                    <p class="text-sm text-secondary">${count} translations</p>
                  </div>
                `;
              }).join('')}
            </div>
          `;
        }
      }

      // Attach nav link handlers
      contentArea.querySelectorAll('.nav-link').forEach(link => {
        link.addEventListener('click', (e) => {
          e.preventDefault();
          navigate(link.getAttribute('href'));
        });
      });
    }

  } catch (error) {
    contentArea.innerHTML = renderError(error.message || 'Failed to load translation data');
  }
}

function renderTranslationEditor(container, translations, projectName, language, filename, filterInput) {
  let currentFilter = '';

  function renderRows() {
    const filtered = translations.filter(t => {
      if (!currentFilter) return true;
      const lower = currentFilter.toLowerCase();
      return t.key.toLowerCase().includes(lower) ||
             t.sourceValue.toLowerCase().includes(lower) ||
             t.currentValue.toLowerCase().includes(lower);
    });

    if (filtered.length === 0) {
      container.innerHTML = renderEmptyState('🔍', 'No translations found', 'Try adjusting your search filter.');
      return;
    }

    container.innerHTML = `
      <div class="grid gap-4">
        ${filtered.map((t, i) => `
          <div class="card sm grid grid-2 gap-4 items-start" data-key="${escapeHtml(t.key)}">
            <div class="flex flex-col gap-2">
              <div class="flex items-center gap-2">
                <code class="code-chip">${escapeHtml(t.key)}</code>
                ${t.hasApproved ? '<span class="badge success">Approved</span>' : ''}
                ${t.hasPending ? '<span class="badge warning">Pending</span>' : ''}
              </div>
              <p class="text-secondary">${escapeHtml(t.sourceValue)}</p>
            </div>
            <div class="flex flex-col gap-2">
              <textarea class="input translation-input" rows="2" data-key="${escapeHtml(t.key)}" data-index="${i}">${escapeHtml(t.currentValue)}</textarea>
              <div class="flex justify-end">
                <button class="btn primary sm save-btn" data-key="${escapeHtml(t.key)}" data-index="${i}">Save</button>
              </div>
            </div>
          </div>
        `).join('')}
      </div>
    `;

    // Attach event handlers
    container.querySelectorAll('.translation-input').forEach(textarea => {
      textarea.addEventListener('input', (e) => {
        const index = parseInt(e.target.dataset.index);
        translations[index].currentValue = e.target.value;
      });
    });

    container.querySelectorAll('.save-btn').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const key = e.target.dataset.key;
        const index = parseInt(e.target.dataset.index);
        const value = translations[index].currentValue;

        btn.disabled = true;
        btn.textContent = 'Saving...';

        try {
          await apiFetch(`${API_BASE}/projects/${encodeURIComponent(projectName)}/translations`, {
            method: 'POST',
            body: JSON.stringify({ language, filename, key, value })
          });
          btn.textContent = 'Saved!';
          btn.classList.remove('primary');
          btn.classList.add('success');
          setTimeout(() => {
            btn.textContent = 'Save';
            btn.classList.remove('success');
            btn.classList.add('primary');
            btn.disabled = false;
          }, 2000);
        } catch (error) {
          btn.textContent = 'Error';
          btn.classList.remove('primary');
          btn.classList.add('danger');
          setTimeout(() => {
            btn.textContent = 'Save';
            btn.classList.remove('danger');
            btn.classList.add('primary');
            btn.disabled = false;
          }, 2000);
        }
      });
    });
  }

  filterInput?.addEventListener('input', (e) => {
    currentFilter = e.target.value;
    renderRows();
  });

  renderRows();
}

function renderNotFoundPage() {
  return renderEmptyState('404', 'Page Not Found', 'The page you are looking for does not exist.');
}

// ============================================================================
// Main Render Function
// ============================================================================

async function render() {
  const main = document.getElementById('main');
  const route = parseRoute(state.currentPath);

  // Render navigation
  renderNav();

  // Check if route requires auth
  const publicRoutes = ['home', 'login'];
  const requiresAuth = !publicRoutes.includes(route.name);

  if (requiresAuth && state.auth.status === 'checking') {
    main.innerHTML = renderLoading();
    return;
  }

  if (requiresAuth && state.auth.status === 'loggedOut') {
    navigate('/login');
    return;
  }

  // Render page based on route
  switch (route.name) {
    case 'home':
      main.innerHTML = renderHomePage();
      break;

    case 'login':
      main.innerHTML = renderLoginPage();
      break;

    case 'dashboard':
      await renderDashboardPage();
      break;

    case 'createProject':
      main.innerHTML = renderCreateProjectPage();
      setupCreateProjectForm();
      break;

    case 'projectView':
      await renderProjectViewPage(route.params.projectName);
      break;

    case 'translations':
      await renderTranslationsPage(route.params.projectName, null, null);
      break;

    case 'translationEditor':
      await renderTranslationsPage(route.params.projectName, route.params.language, null);
      break;

    default:
      main.innerHTML = renderNotFoundPage();
  }

  // Handle all internal links
  main.querySelectorAll('a[href^="/"]').forEach(link => {
    if (!link.classList.contains('nav-link') && !link.classList.contains('project-card')) {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        navigate(link.getAttribute('href'));
      });
    }
  });
}

// ============================================================================
// Initialize
// ============================================================================

async function init() {
  // Handle browser back/forward
  window.addEventListener('popstate', () => {
    state.currentPath = window.location.pathname;
    render();
  });

  // Check authentication
  try {
    const data = await apiFetch(`${API_BASE}/auth/me`);
    if (data?.user) {
      state.auth = { status: 'loggedIn', user: data.user };
    } else {
      state.auth = { status: 'loggedOut', user: null };
    }
  } catch {
    state.auth = { status: 'loggedOut', user: null };
  }

  // Initial render
  render();
}

// Start the application
init();
