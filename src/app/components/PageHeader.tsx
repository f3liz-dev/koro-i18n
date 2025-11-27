import { JSX, For, Show, createSignal } from 'solid-js';

export interface MenuItem {
  label: string;
  onClick: () => void;
  ref?: (el: HTMLElement | undefined) => void;
  show?: boolean;
  variant?: 'primary' | 'default' | 'danger' | string;
  icon?: JSX.Element;
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
    <header style={{ 
      position: 'sticky', 
      top: '0', 
      'z-index': '50',
      background: 'rgba(255, 255, 255, 0.9)',
      'backdrop-filter': 'blur(12px)',
      '-webkit-backdrop-filter': 'blur(12px)',
      'border-bottom': '1px solid var(--border-light)'
    }}>
      <div class="container" style={{ 
        display: 'flex', 
        'align-items': 'center', 
        'justify-content': 'space-between', 
        padding: '0.875rem 0',
        'min-height': '3.5rem'
      }}>
        <div style={{ display: 'flex', 'align-items': 'center', gap: '0.875rem' }}>
          <Show when={props.backButton}>
            <button
              ref={props.backButton?.ref}
              onClick={props.backButton?.onClick}
              class="btn ghost"
              style={{ padding: '0.5rem' }}
              aria-label="Go back"
            >
              <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
              </svg>
            </button>
          </Show>

          <Show when={props.logo}>
            <span class="badge" style={{ 'font-weight': '600' }}>koro</span>
          </Show>

          <div>
            <h1 style={{ 
              'font-size': '1.25rem', 
              'font-weight': '700',
              'letter-spacing': '-0.02em',
              margin: '0'
            }} innerHTML={props.title}></h1>
            <Show when={props.subtitle}>
              <div style={{ 
                'font-size': '0.8125rem', 
                color: 'var(--text-secondary)', 
                'margin-top': '0.125rem' 
              }} innerHTML={props.subtitle!}></div>
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
                class={`btn ${item.variant === 'primary' ? 'primary' : item.variant === 'danger' ? 'danger' : 'ghost'}`}
              >
                {item.icon}
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
            <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        </div>
      </div>

      {/* Mobile menu dropdown */}
      <Show when={mobileOpen()}>
        <div class="md:hidden animate-slide-down" style={{ 
          'border-top': '1px solid var(--border-light)', 
          padding: '0.75rem 0',
          background: 'var(--bg)'
        }}>
          <div class="container" style={{ display: 'flex', 'flex-direction': 'column', gap: '0.5rem' }}>
            <For each={props.menuItems}>{(item) => (
              <Show when={item.show ?? true}>
                <button
                  ref={item.ref}
                  onClick={() => { item.onClick(); setMobileOpen(false); }}
                  class={`btn w-full ${item.variant === 'primary' ? 'primary' : item.variant === 'danger' ? 'danger' : ''}`}
                >
                  {item.icon}
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
