/**
 * Responsive layout component that adapts to different screen sizes and input methods
 */

import { Component, JSX, Show, createMemo } from 'solid-js';
import { useResponsive, useBreakpoint, useTouch } from '../../hooks/useResponsive';

interface ResponsiveLayoutProps {
  children: JSX.Element;
  sidebar?: JSX.Element;
  header?: JSX.Element;
  footer?: JSX.Element;
  className?: string;
  sidebarPosition?: 'left' | 'right';
  collapsibleSidebar?: boolean;
  mobileBreakpoint?: 'sm' | 'md' | 'lg';
}

const ResponsiveLayout: Component<ResponsiveLayoutProps> = (props) => {
  const responsive = useResponsive();
  const breakpoint = useBreakpoint();
  const touch = useTouch();
  
  const mobileBreakpoint = () => props.mobileBreakpoint || 'md';
  const shouldCollapseSidebar = () => {
    if (!props.collapsibleSidebar) return false;
    return !breakpoint.isAtLeast(mobileBreakpoint());
  };
  
  const layoutClasses = createMemo(() => {
    const classes = ['responsive-layout'];
    
    if (props.className) classes.push(props.className);
    if (touch.isTouchPrimary()) classes.push('touch-primary');
    if (touch.hasTouch()) classes.push('has-touch');
    if (responsive().isHighDPI) classes.push('high-dpi');
    
    classes.push(`breakpoint-${breakpoint.current()}`);
    classes.push(`orientation-${responsive().orientation}`);
    
    return classes.join(' ');
  });
  
  const contentClasses = createMemo(() => {
    const classes = ['layout-content'];
    
    if (props.sidebar && !shouldCollapseSidebar()) {
      classes.push('has-sidebar');
      classes.push(`sidebar-${props.sidebarPosition || 'left'}`);
    }
    
    return classes.join(' ');
  });
  
  return (
    <div class={layoutClasses()}>
      <Show when={props.header}>
        <header class="layout-header">
          {props.header}
        </header>
      </Show>
      
      <div class="layout-body">
        <Show when={props.sidebar && !shouldCollapseSidebar()}>
          <aside class={`layout-sidebar sidebar-${props.sidebarPosition || 'left'}`}>
            {props.sidebar}
          </aside>
        </Show>
        
        <main class={contentClasses()}>
          {props.children}
          
          {/* Mobile sidebar overlay */}
          <Show when={props.sidebar && shouldCollapseSidebar()}>
            <div class="mobile-sidebar-overlay">
              {props.sidebar}
            </div>
          </Show>
        </main>
      </div>
      
      <Show when={props.footer}>
        <footer class="layout-footer">
          {props.footer}
        </footer>
      </Show>
    </div>
  );
};

export default ResponsiveLayout;