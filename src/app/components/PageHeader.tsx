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
      <div class="kawaii-card" style="border-radius: 0; border-left: none; border-right: none; border-top: none; padding: 16px 0; margin: 0;">
        <div class="kawaii-container" style="display: flex; align-items: center; justify-content: space-between;">
          <div style="display: flex; align-items: center; gap: 16px;">
            <Show when={props.backButton}>
              <button
                ref={props.backButton?.ref}
                onClick={props.backButton?.onClick}
                class="kawaii-ghost"
                style="padding: 8px; margin-left: -8px; border-radius: 8px;"
                aria-label="Go back"
              >
                <svg style="width: 20px; height: 20px;" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
              </button>
            </Show>

            <Show when={props.logo}>
              <div class="kawaii-badge">
                <span style="font-weight: 700;" aria-hidden>koro</span>
              </div>
            </Show>

            <div>
              <div style="font-size: 20px; font-weight: 700; color: var(--kawaii-ink);" innerHTML={props.title}></div>
              <Show when={props.subtitle}>
                <div style="font-size: 13px; color: var(--kawaii-muted); margin-top: 2px;" innerHTML={props.subtitle!}></div>
              </Show>
            </div>
          </div>

          <nav style="display: none;" class="md:flex" style:display="flex" style:align-items="center" style:gap="8px">
            <For each={props.menuItems}>{(item) => (
              <Show when={item.show ?? true}>
                <button
                  ref={item.ref}
                  onClick={item.onClick}
                  class={`kawaii-btn transition-all ${item.variant === 'primary' ? 'primary' : 'secondary'}`}>
                  {item.label}
                </button>
              </Show>
            )}</For>
          </nav>

          <div class="md:hidden">
            <button
              onClick={() => setMobileOpen(!mobileOpen())}
              class="kawaii-ghost"
              style="padding: 8px; border-radius: 8px;"
              aria-label="Toggle menu"
            >
              <svg style="width: 20px; height: 20px; color: var(--kawaii-ink);" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      <Show when={mobileOpen()}>
        <div class="md:hidden kawaii-panel animate-slide-down" style="margin: 0; border-radius: 0;">
          <div class="kawaii-container" style="display: flex; flex-direction: column; gap: 8px;">
            <For each={props.menuItems}>{(item) => (
              <Show when={item.show ?? true}>
                <button
                  ref={item.ref}
                  onClick={(e) => { item.onClick(); setMobileOpen(false); }}
                  class={`kawaii-btn ${item.variant === 'primary' ? 'primary' : 'secondary'}`}
                  style="width: 100%; justify-content: center;">
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
