import { ParentComponent, Show } from 'solid-js';
import { A, useLocation } from '@solidjs/router';
import { useAuth } from '../auth';
import '../styles/minimal.css';

export const SimpleLayout: ParentComponent = (props) => {
  const { user, login, logout } = useAuth();
  const location = useLocation();

  return (
    <div class="min-h-screen bg-surface">
      <header class="header">
        <div class="container inner">
          <A href="/" class="brand">
            <div style={{"font-size":"20px"}}>🌐</div>
            <span>koro i18n</span>
          </A>

          <nav class="nav">
            <A href="/projects" class="small">Projects</A>
            <A href="/docs" class="small">Docs</A>
            <Show when={!user()} fallback={<button onClick={() => logout()} class="btn ghost">Sign Out</button>}>
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
        © {new Date().getFullYear()} • Made with ❤️ by f3liz-dev
      </footer>
    </div>
  );
};

export default SimpleLayout;
