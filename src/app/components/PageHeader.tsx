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
    <header class="page-header sticky top-0 z-50">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="flex items-center justify-between h-16">
          <div class="flex items-center gap-4">
            <Show when={props.backButton}>
              <button
                ref={props.backButton?.ref}
                onClick={props.backButton?.onClick}
                class="kawaii-ghost p-2 -ml-2 rounded-lg"
                aria-label="Go back"
              >
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
              </button>
            </Show>

            <Show when={props.logo}>
              <div class="kawaii-badge">
                <span class="font-bold" aria-hidden>koro</span>
              </div>
            </Show>

            <div>
              <div class="title" innerHTML={props.title}></div>
              <Show when={props.subtitle}>
                <div class="subtitle mt-0.5" innerHTML={props.subtitle!}></div>
              </Show>
            </div>
          </div>

          <nav class="hidden md:flex items-center gap-2">
            <For each={props.menuItems}>{(item) => (
              <Show when={item.show ?? true}>
                <button
                  ref={item.ref}
                  onClick={item.onClick}
                  class={`text-sm font-medium transition-all duration-200 ${item.variant === 'primary'
                      ? 'kawaii-btn'
                      : 'kawaii-btn secondary'
                    }`}>
                  {item.label}
                </button>
              </Show>
            )}</For>
          </nav>

          <div class="md:hidden">
            <button
              onClick={() => setMobileOpen(!mobileOpen())}
              class="kawaii-ghost p-2 rounded-lg"
              aria-label="Toggle menu"
            >
              <svg class="w-5 h-5 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      <Show when={mobileOpen()}>
        <div class="md:hidden kawaii-panel animate-slide-down">
          <div class="px-4 py-3 flex flex-col gap-2">
            <For each={props.menuItems}>{(item) => (
              <Show when={item.show ?? true}>
                <button
                  ref={item.ref}
                  onClick={(e) => { item.onClick(); setMobileOpen(false); }}
                  class={`w-full text-left px-4 py-3 rounded-lg text-sm font-medium transition-all ${item.variant === 'primary'
                      ? 'kawaii-btn'
                      : 'kawaii-ghost'
                    }`}>
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
