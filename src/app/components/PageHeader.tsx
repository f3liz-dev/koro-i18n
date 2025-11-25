import { JSX, For, Show, createSignal } from 'solid-js';

export interface MenuItem {
  label: string;
  onClick: () => void;
  ref?: (el: HTMLElement | undefined) => void;
  show?: boolean;
  variant?: 'primary' | 'default' | string;
}

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  logo?: boolean;
  backButton?: { onClick: () => void; ref?: (el: HTMLElement | undefined) => void };
  menuItems?: MenuItem[];
  children?: JSX.Element;
}

export function PageHeader(props: PageHeaderProps) {
  const [mobileOpen, setMobileOpen] = createSignal(false);

  return (
    <header class="panel border-b" style={{ position: 'sticky', top: '0', 'z-index': '50', 'border-radius': '0', margin: '0' }}>
      <div class="container" style={{ display: 'flex', 'align-items': 'center', 'justify-content': 'space-between', padding: '0.75rem 0' }}>
        <div style={{ display: 'flex', 'align-items': 'center', gap: '0.75rem' }}>
          <Show when={props.backButton}>
            <button
              ref={props.backButton?.ref}
              onClick={props.backButton?.onClick}
              class="btn ghost"
              style={{ padding: '0.5rem' }}
              aria-label="Go back"
            >
              ←
            </button>
          </Show>

          <Show when={props.logo}>
            <span class="badge" style={{ 'font-weight': '600' }}>koro</span>
          </Show>

          <div>
            <div style={{ 'font-size': '1.125rem', 'font-weight': '600' }} innerHTML={props.title}></div>
            <Show when={props.subtitle}>
              <div style={{ 'font-size': '0.75rem', color: 'var(--text-secondary)', 'margin-top': '0.125rem' }} innerHTML={props.subtitle!}></div>
            </Show>
          </div>
        </div>

        {/* Desktop navigation */}
        <nav style={{ display: 'none', 'align-items': 'center', gap: '0.5rem' }} class="hidden md:flex">
          <For each={props.menuItems}>{(item) => (
            <Show when={item.show ?? true}>
              <button
                ref={item.ref}
                onClick={item.onClick}
                class={`btn ${item.variant === 'primary' ? 'primary' : 'ghost'}`}
              >
                {item.label}
              </button>
            </Show>
          )}</For>
        </nav>

        {/* Mobile menu button */}
        <div class="md:hidden">
          <button
            onClick={() => setMobileOpen(!mobileOpen())}
            class="btn ghost"
            style={{ padding: '0.5rem' }}
            aria-label="Toggle menu"
          >
            ☰
          </button>
        </div>
      </div>

      {/* Mobile menu dropdown */}
      <Show when={mobileOpen()}>
        <div class="md:hidden animate-slide-down" style={{ 'border-top': '1px solid var(--border)', padding: '0.75rem 0' }}>
          <div class="container" style={{ display: 'flex', 'flex-direction': 'column', gap: '0.5rem' }}>
            <For each={props.menuItems}>{(item) => (
              <Show when={item.show ?? true}>
                <button
                  ref={item.ref}
                  onClick={() => { item.onClick(); setMobileOpen(false); }}
                  class={`btn w-full ${item.variant === 'primary' ? 'primary' : ''}`}
                >
                  {item.label}
                </button>
              </Show>
            )}</For>
          </div>
        </div>
      </Show>
    </header>
  );
}

export default PageHeader;
