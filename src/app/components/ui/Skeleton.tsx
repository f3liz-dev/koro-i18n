interface SkeletonProps {
  width?: string;
  height?: string;
}

export function Skeleton(props: SkeletonProps) {
  return (
    <div
      class="animate-pulse"
      style={{
        width: props.width || '100%',
        height: props.height || '1rem',
        background: 'var(--surface)',
        'border-radius': 'var(--radius)'
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
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton key={i} width={i === lines - 1 && lines > 1 ? '80%' : '100%'} height="0.875rem" />
      ))}
    </div>
  );
}

export function SkeletonCard() {
  return (
    <div class="card" style={{ padding: '1.25rem' }}>
      <div style={{ 'margin-bottom': '1rem' }}>
        <Skeleton width="60%" height="1.25rem" />
        <div style={{ height: '0.5rem' }} />
        <Skeleton width="80%" height="0.75rem" />
      </div>
      <div style={{ display: 'flex', 'flex-wrap': 'wrap', gap: '0.5rem' }}>
        <Skeleton width="3rem" height="1.5rem" />
        <Skeleton width="3rem" height="1.5rem" />
        <Skeleton width="3rem" height="1.5rem" />
      </div>
    </div>
  );
}

export function SkeletonListItem() {
  return (
    <div style={{ padding: '1rem' }}>
      <div style={{ display: 'flex', 'align-items': 'flex-start', 'justify-content': 'space-between', 'margin-bottom': '0.5rem' }}>
        <Skeleton width="70%" height="0.875rem" />
        <Skeleton width="1.5rem" height="1.5rem" />
      </div>
      <Skeleton width="90%" height="0.875rem" />
      <div style={{ height: '0.25rem' }} />
      <Skeleton width="85%" height="0.875rem" />
    </div>
  );
}

export function SkeletonPanel() {
  return (
    <div class="panel" style={{ padding: '1rem' }}>
      <Skeleton width="50%" height="1rem" />
      <div style={{ height: '1rem' }} />
      <div class="space-y-3">
        <div>
          <Skeleton width="30%" height="0.875rem" />
          <div style={{ height: '0.5rem' }} />
          <Skeleton width="100%" height="6rem" />
        </div>
        <div>
          <Skeleton width="30%" height="0.875rem" />
          <div style={{ height: '0.5rem' }} />
          <Skeleton width="100%" height="8rem" />
        </div>
      </div>
    </div>
  );
}

export function SkeletonTableRow() {
  return (
    <div class="card" style={{ padding: '1rem', display: 'flex', 'align-items': 'center', 'justify-content': 'space-between' }}>
      <div style={{ display: 'flex', 'align-items': 'center', gap: '0.75rem', flex: '1' }}>
        <Skeleton width="2.5rem" height="2.5rem" />
        <div style={{ flex: '1' }}>
          <Skeleton width="40%" height="1rem" />
          <div style={{ height: '0.25rem' }} />
          <Skeleton width="30%" height="0.75rem" />
        </div>
      </div>
      <div style={{ display: 'flex', gap: '0.5rem' }}>
        <Skeleton width="4rem" height="1.875rem" />
        <Skeleton width="4rem" height="1.875rem" />
      </div>
    </div>
  );
}
