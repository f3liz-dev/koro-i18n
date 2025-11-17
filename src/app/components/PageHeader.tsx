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
    <header class="bg-white border-b border-gray-200 backdrop-blur-sm sticky top-0 z-50">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="flex items-center justify-between h-16">
          <div class="flex items-center gap-4">
            <Show when={props.backButton}>
              <button
                ref={props.backButton?.ref}
                onClick={props.backButton?.onClick}
                class="text-gray-400 hover:text-primary-600 transition-colors p-2 -ml-2 rounded-lg hover:bg-primary-50"
                aria-label="Go back"
              >
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
              </button>
            </Show>
            <Show when={props.logo}>
              <div class="text-xl font-bold bg-gradient-to-r from-primary-600 to-accent-600 bg-clip-text text-transparent">
                koro
              </div>
            </Show>
            <div>
              <div class="text-lg font-semibold text-gray-900" innerHTML={props.title}></div>
              <Show when={props.subtitle}>
                <div class="text-xs text-gray-500 mt-0.5" innerHTML={props.subtitle!}></div>
              </Show>
            </div>
          </div>

          <nav class="hidden md:flex items-center gap-2">
            <For each={props.menuItems}>{(item) => (
              <Show when={item.show ?? true}>
                <button
                  ref={item.ref}
                  onClick={item.onClick}
                  class={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                    item.variant === 'primary' 
                      ? 'bg-gradient-to-r from-primary-500 to-primary-600 text-white shadow-md hover:shadow-lg hover:scale-105 active:scale-95' 
                      : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                  }`}>
                  {item.label}
                </button>
              </Show>
            )}</For>
          </nav>

          <div class="md:hidden">
            <button 
              onClick={() => setMobileOpen(!mobileOpen())} 
              class="p-2 rounded-lg bg-gray-100 hover:bg-gray-200 transition-colors"
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
        <div class="md:hidden border-t border-gray-200 bg-white animate-slide-down">
          <div class="px-4 py-3 flex flex-col gap-2">
            <For each={props.menuItems}>{(item) => (
              <Show when={item.show ?? true}>
                <button
                  ref={item.ref}
                  onClick={(e) => { item.onClick(); setMobileOpen(false); }}
                  class={`w-full text-left px-4 py-3 rounded-lg text-sm font-medium transition-all ${
                    item.variant === 'primary'
                      ? 'bg-gradient-to-r from-primary-500 to-primary-600 text-white shadow-md' 
                      : 'bg-gray-50 hover:bg-gray-100 text-gray-700'
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
