import { ParentComponent, Show } from 'solid-js';
import { A, useLocation } from '@solidjs/router';
import { useAuth } from '../auth';
import '../styles/minimal.css';

export const SimpleLayout: ParentComponent = (props) => {
  const { user, login, logout } = useAuth();
  const location = useLocation();

  const isActive = (path: string) => location.pathname === path || location.pathname.startsWith(path + '/');

  return (
    <div class="page">
      <header class="header">
        <div class="inner">
          <A href="/" class="brand">
            <span style={{ "font-size": "1.5rem" }}>🌐</span>
            <span>koro i18n</span>
          </A>

          <nav class="nav">
            <A 
              href="/projects"
              style={{
                color: isActive('/projects') || isActive('/dashboard') ? 'var(--accent)' : undefined,
                background: isActive('/projects') || isActive('/dashboard') ? 'var(--accent-light)' : undefined
              }}
            >
              Projects
            </A>
            <A 
              href="/history"
              style={{
                color: isActive('/history') ? 'var(--accent)' : undefined,
                background: isActive('/history') ? 'var(--accent-light)' : undefined
              }}
            >
              History
            </A>
            <Show when={!user()} fallback={
              <div style={{ display: 'flex', 'align-items': 'center', gap: '0.75rem' }}>
                <Show when={user()?.avatarUrl}>
                  <img 
                    src={user()?.avatarUrl} 
                    alt={user()?.username || 'User'} 
                    style={{ 
                      width: '2rem', 
                      height: '2rem', 
                      'border-radius': '50%',
                      border: '2px solid var(--border)'
                    }} 
                  />
                </Show>
                <button onClick={() => logout()} class="btn ghost">Sign Out</button>
              </div>
            }>
              <button onClick={() => login()} class="btn primary">Sign In</button>
            </Show>
          </nav>
        </div>
      </header>

      <main class="main">
        <div class="container">
          {props.children}
        </div>
      </main>

      <footer class="footer">
        <span>© {new Date().getFullYear()} koro i18n</span>
        <span style={{ margin: '0 0.75rem', color: 'var(--border)' }}>·</span>
        <a 
          href="https://github.com" 
          target="_blank" 
          rel="noopener noreferrer"
          style={{ color: 'var(--text-muted)', 'text-decoration': 'none' }}
        >
          GitHub
        </a>
      </footer>
    </div>
  );
};

export default SimpleLayout;
