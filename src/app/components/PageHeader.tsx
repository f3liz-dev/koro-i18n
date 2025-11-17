import { JSX, For, Show, createSignal } from 'solid-js';

export interface MenuItem {
  label: string;
  onClick: () => void;
  ref?: (el: HTMLElement | undefined) => void;
  // Optional flag to conditionally show this menu item
  show?: boolean;
  // Optional variant to allow for different styles (e.g. 'primary' for CTA)
  variant?: 'primary' | 'default' | string;
}

interface PageHeaderProps {
  title: string;
  subtitle?: string; // HTML allowed
  logo?: boolean;
  backButton?: { onClick: () => void; ref?: (el: HTMLElement | undefined) => void };
  menuItems?: MenuItem[];
  children?: JSX.Element;
}

export function PageHeader(props: PageHeaderProps) {
  const [mobileOpen, setMobileOpen] = createSignal(false);

  return (
    <header class="bg-white border-b">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="flex items-center justify-between h-16">
          <div class="flex items-center gap-4">
            <Show when={props.logo}>
              <div class="text-xl font-bold">koro</div>
            </Show>
            <div>
              <div class="text-lg font-semibold" innerHTML={props.title}></div>
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
                  class={`px-3 py-2 rounded text-sm ${item.variant === 'primary' ? 'bg-blue-600 text-white hover:bg-blue-700' : 'bg-gray-100 hover:bg-gray-200'}`}>
                  {item.label}
                </button>
              </Show>
            )}</For>
          </nav>

          <div class="md:hidden">
            <button onClick={() => setMobileOpen(!mobileOpen())} class="p-2 rounded bg-gray-100">
              ☰
            </button>
          </div>
        </div>
      </div>

      <Show when={mobileOpen()}>
        <div class="md:hidden border-t">
          <div class="px-4 py-3 flex flex-col gap-2">
            <For each={props.menuItems}>{(item) => (
              <Show when={item.show ?? true}>
                <button
                  ref={item.ref}
                  onClick={(e) => { item.onClick(); setMobileOpen(false); }}
                  class={`w-full text-left px-3 py-2 rounded text-sm ${item.variant === 'primary' ? 'bg-blue-600 text-white hover:bg-blue-700' : 'bg-gray-50 hover:bg-gray-100'}`}>
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
