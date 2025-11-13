import { JSX, Show, createSignal, For } from 'solid-js';

export interface MenuItem {
  label: string;
  onClick: () => void;
  variant?: 'default' | 'primary' | 'danger';
  ref?: (el: HTMLButtonElement) => void;
  show?: boolean;
}

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  logo?: boolean;
  backButton?: {
    onClick: () => void;
    ref?: (el: HTMLButtonElement) => void;
  };
  menuItems?: MenuItem[];
  children?: JSX.Element;
}

export default function PageHeader(props: PageHeaderProps) {
  const [showMobileMenu, setShowMobileMenu] = createSignal(false);

  const getButtonClasses = (variant: string = 'default') => {
    switch (variant) {
      case 'primary':
        return 'px-3 py-1.5 text-sm text-blue-600 hover:text-blue-700 rounded-lg hover:bg-blue-50';
      case 'danger':
        return 'px-3 py-1.5 text-sm text-red-600 hover:text-red-700 rounded-lg hover:bg-red-50';
      default:
        return 'px-3 py-1.5 text-sm text-gray-600 hover:text-gray-900 rounded-lg hover:bg-gray-100';
    }
  };

  const visibleMenuItems = () => (props.menuItems || []).filter(item => item.show !== false);

  return (
    <>
      <div class="bg-white border-b">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div class="flex items-center justify-between">
            {/* Left side - Title and optional back button */}
            <div class="flex items-center gap-3">
              <Show when={props.backButton}>
                <button
                  ref={props.backButton?.ref}
                  onClick={props.backButton?.onClick}
                  class="text-gray-400 hover:text-gray-600"
                >
                  <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                  </svg>
                </button>
              </Show>
              
              <Show when={props.logo}>
                <img 
                  src="/logo.png" 
                  alt="Koro i18n" 
                  class="w-8 h-8 object-contain"
                />
              </Show>

              <div>
                <h1 class="text-xl font-semibold text-gray-900">{props.title}</h1>
                <Show when={props.subtitle}>
                  <div innerHTML={props.subtitle} class="text-xs text-gray-500" />
                </Show>
              </div>
            </div>

            {/* Right side - Menu items */}
            <div class="flex items-center gap-2">
              {/* Desktop menu - hidden on small screens */}
              <div class="hidden md:flex items-center gap-2">
                {props.children}
                <For each={visibleMenuItems()}>
                  {(item) => (
                    <button
                      ref={item.ref}
                      onClick={item.onClick}
                      class={getButtonClasses(item.variant)}
                    >
                      {item.label}
                    </button>
                  )}
                </For>
              </div>

              {/* Hamburger menu button - visible only on small screens */}
              <Show when={visibleMenuItems().length > 0}>
                <button
                  onClick={() => setShowMobileMenu(!showMobileMenu())}
                  class="md:hidden p-2 hover:bg-gray-100 rounded"
                  aria-label="Menu"
                >
                  <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />
                  </svg>
                </button>
              </Show>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile menu overlay - visible only on small screens */}
      <Show when={showMobileMenu() && visibleMenuItems().length > 0}>
        {/* Backdrop */}
        <div 
          class="md:hidden fixed inset-0 bg-black bg-opacity-50 z-40" 
          onClick={() => setShowMobileMenu(false)} 
        />
        
        {/* Slide-in Menu */}
        <div class="md:hidden fixed top-0 right-0 bottom-0 w-[85%] max-w-sm bg-white shadow-lg z-50 flex flex-col">
          {/* Header */}
          <div class="flex items-center justify-between p-4 border-b">
            <h2 class="text-lg font-semibold">Menu</h2>
            <button
              onClick={() => setShowMobileMenu(false)}
              class="p-2 hover:bg-gray-100 rounded"
              aria-label="Close"
            >
              <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Menu Items */}
          <div class="flex-1 overflow-y-auto p-4">
            <div class="space-y-2">
              {props.children}
              <For each={visibleMenuItems()}>
                {(item) => (
                  <button
                    ref={item.ref}
                    onClick={() => {
                      item.onClick();
                      setShowMobileMenu(false);
                    }}
                    class={`w-full text-left ${getButtonClasses(item.variant)}`}
                  >
                    {item.label}
                  </button>
                )}
              </For>
            </div>
          </div>
        </div>
      </Show>
    </>
  );
}
