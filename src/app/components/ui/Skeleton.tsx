import { For } from 'solid-js';

interface SkeletonProps {
  width?: string;
  height?: string;
}

export function Skeleton(props: SkeletonProps) {
  return (
    <div
      class="skeleton"
      style={{
        width: props.width || '100%',
        height: props.height || '1rem'
      }}
    />
  );
}

interface SkeletonTextProps {
  lines?: number;
}

export function SkeletonText(props: SkeletonTextProps) {
  const lines = props.lines || 1;
  return (
    <div class="space-y-2">
      <For each={Array.from({ length: lines })}>
        {(_, i) => (
          <Skeleton width={i() === lines - 1 && lines > 1 ? '80%' : '100%'} height="0.875rem" />
        )}
      </For>
    </div>
  );
}

export function SkeletonCard() {
  return (
    <div class="card" style={{ padding: '1.5rem' }}>
      <div style={{ 'margin-bottom': '1.25rem' }}>
        <Skeleton width="55%" height="1.375rem" />
        <div style={{ height: '0.625rem' }} />
        <Skeleton width="75%" height="0.875rem" />
      </div>
      <div style={{ display: 'flex', 'flex-wrap': 'wrap', gap: '0.5rem', 'margin-bottom': '1rem' }}>
        <Skeleton width="3.5rem" height="1.625rem" />
        <Skeleton width="3.5rem" height="1.625rem" />
        <Skeleton width="3.5rem" height="1.625rem" />
      </div>
      <div style={{ 
        'padding-top': '0.875rem', 
        'border-top': '1px solid var(--border-light)',
        display: 'flex',
        'justify-content': 'space-between',
        'align-items': 'center'
      }}>
        <Skeleton width="6rem" height="0.875rem" />
        <Skeleton width="5rem" height="2rem" />
      </div>
    </div>
  );
}

export function SkeletonListItem() {
  return (
    <div style={{ padding: '1rem' }}>
      <div style={{ display: 'flex', 'align-items': 'flex-start', 'justify-content': 'space-between', 'margin-bottom': '0.625rem' }}>
        <Skeleton width="65%" height="1rem" />
        <Skeleton width="1.75rem" height="1.75rem" />
      </div>
      <Skeleton width="90%" height="0.875rem" />
      <div style={{ height: '0.375rem' }} />
      <Skeleton width="80%" height="0.875rem" />
    </div>
  );
}

export function SkeletonPanel() {
  return (
    <div class="card" style={{ padding: '1.5rem' }}>
      <Skeleton width="45%" height="1.125rem" />
      <div style={{ height: '1.25rem' }} />
      <div class="space-y-4">
        <div>
          <Skeleton width="25%" height="0.875rem" />
          <div style={{ height: '0.625rem' }} />
          <Skeleton width="100%" height="5rem" />
        </div>
        <div>
          <Skeleton width="25%" height="0.875rem" />
          <div style={{ height: '0.625rem' }} />
          <Skeleton width="100%" height="7rem" />
        </div>
      </div>
    </div>
  );
}

export function SkeletonTableRow() {
  return (
    <div class="card" style={{ padding: '1rem', display: 'flex', 'align-items': 'center', 'justify-content': 'space-between' }}>
      <div style={{ display: 'flex', 'align-items': 'center', gap: '0.875rem', flex: '1' }}>
        <Skeleton width="2.75rem" height="2.75rem" />
        <div style={{ flex: '1' }}>
          <Skeleton width="45%" height="1rem" />
          <div style={{ height: '0.375rem' }} />
          <Skeleton width="30%" height="0.75rem" />
        </div>
      </div>
      <div style={{ display: 'flex', gap: '0.625rem' }}>
        <Skeleton width="4.5rem" height="2rem" />
        <Skeleton width="4.5rem" height="2rem" />
      </div>
    </div>
  );
}
