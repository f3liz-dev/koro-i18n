import { ParentComponent, Show } from 'solid-js';
import { A } from '@solidjs/router';
import { useAuth } from '../auth';
import '../styles/minimal.css';

export const SimpleLayout: ParentComponent = (props) => {
  const { user, login, logout } = useAuth();

  return (
    <div class="page">
      <header class="header">
        <div class="inner">
          <A href="/" class="brand">
            <span style={{ "font-size": "1.25rem" }}>🌐</span>
            <span>koro i18n</span>
          </A>

          <nav class="nav">
            <A href="/projects">Projects</A>
            <Show when={!user()} fallback={
              <button onClick={() => logout()} class="btn ghost">Sign Out</button>
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
        © {new Date().getFullYear()} koro i18n
      </footer>
    </div>
  );
};

export default SimpleLayout;
