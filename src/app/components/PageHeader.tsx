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
    <header style="position: sticky; top: 0; z-index: 50;">
      <div class="card" style="
        border-radius: 0;
        border-left: none;
        border-right: none;
        border-top: none;
        padding: 1rem 0;
        margin: 0;
        box-shadow: var(--shadow-soft);
      ">
        <div class="container" style="display: flex; align-items: center; justify-content: space-between;">
          <div style="display: flex; align-items: center; gap: 1rem;">
            <Show when={props.backButton}>
              <button
                ref={props.backButton?.ref}
                onClick={props.backButton?.onClick}
                class="btn"
                style="padding: 0.625rem; margin-left: -0.625rem; border-radius: var(--radius); background: none; border: none; box-shadow: none;"
                aria-label="Go back"
              >
                <svg style="width: 1.25rem; height: 1.25rem; color: var(--color-text-secondary);" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
              </button>
            </Show>

            <Show when={props.logo}>
              <div class="badge primary" style="font-size: 0.875rem;">
                <span style="font-weight: 600;" aria-hidden>koro</span>
              </div>
            </Show>

            <div>
              <div style="font-size: 1.25rem; font-weight: 600; color: var(--color-text-primary);" innerHTML={props.title}></div>
              <Show when={props.subtitle}>
                <div style="font-size: 0.813rem; color: var(--color-text-secondary); margin-top: 0.125rem;" innerHTML={props.subtitle!}></div>
              </Show>
            </div>
          </div>

          <nav class="hidden md:flex" style="align-items: center; gap: 0.625rem;">
            <For each={props.menuItems}>{(item) => (
              <Show when={item.show ?? true}>
                <button
                  ref={item.ref}
                  onClick={item.onClick}
                  class={`btn transition-all ${item.variant === 'primary' ? 'primary' : ''}`}
                  style="border-radius: var(--radius);">
                  {item.label}
                </button>
              </Show>
            )}</For>
          </nav>

          <div class="md:hidden">
            <button
              onClick={() => setMobileOpen(!mobileOpen())}
              class="btn"
              style="padding: 0.625rem; border-radius: var(--radius); background: none; border: none; box-shadow: none;"
              aria-label="Toggle menu"
            >
              <svg style="width: 1.25rem; height: 1.25rem; color: var(--color-text-primary);" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      <Show when={mobileOpen()}>
        <div class="md:hidden card animate-slide-down" style="margin: 0; border-radius: 0; border-top: var(--border); box-shadow: var(--shadow-soft);">
          <div class="container" style="display: flex; flex-direction: column; gap: 0.625rem;">
            <For each={props.menuItems}>{(item) => (
              <Show when={item.show ?? true}>
                <button
                  ref={item.ref}
                  onClick={(e) => { item.onClick(); setMobileOpen(false); }}
                  class={`btn ${item.variant === 'primary' ? 'primary' : ''}`}
                  style="width: 100%; justify-content: center; border-radius: var(--radius);">
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
