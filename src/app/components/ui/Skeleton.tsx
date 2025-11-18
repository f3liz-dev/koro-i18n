interface SkeletonProps {
  width?: string;
  height?: string;
  className?: string;
  rounded?: 'none' | 'sm' | 'md' | 'lg' | 'full';
}

export function Skeleton(props: SkeletonProps) {
  const roundedClass = {
    'none': '',
    'sm': 'rounded-sm',
    'md': 'rounded',
    'lg': 'rounded-lg',
    'full': 'rounded-full',
  }[props.rounded || 'md'];

  return (
    <div
      class={`kawaii-ghost animate-pulse ${roundedClass} ${props.className || ''}`}
      style={{
        width: props.width || '100%',
        height: props.height || '1rem',
      }}
    />
  );
}

interface SkeletonTextProps {
  lines?: number;
  className?: string;
}

export function SkeletonText(props: SkeletonTextProps) {
  const lines = props.lines || 1;
  return (
    <div class={`space-y-2 ${props.className || ''}`}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton width={i === lines - 1 && lines > 1 ? '80%' : '100%'} height="0.875rem" />
      ))}
    </div>
  );
}

interface SkeletonCardProps {
  className?: string;
}

export function SkeletonCard(props: SkeletonCardProps) {
  return (
    <div class={`kawaii-card p-6 ${props.className || ''}`}>
      <div class="mb-4">
        <Skeleton width="60%" height="1.25rem" className="mb-2" />
        <Skeleton width="80%" height="0.75rem" />
      </div>
      <div class="flex flex-wrap gap-2">
        <Skeleton width="3rem" height="1.5rem" rounded="sm" />
        <Skeleton width="3rem" height="1.5rem" rounded="sm" />
        <Skeleton width="3rem" height="1.5rem" rounded="sm" />
      </div>
    </div>
  );
}

interface SkeletonListItemProps {
  className?: string;
}

export function SkeletonListItem(props: SkeletonListItemProps) {
  return (
    <div class={`p-3 lg:p-4 ${props.className || ''}`}>
      <div class="flex items-start justify-between mb-2">
        <Skeleton width="70%" height="0.875rem" />
        <Skeleton width="1.5rem" height="1.5rem" rounded="sm" />
      </div>
      <Skeleton width="90%" height="0.875rem" className="mb-1" />
      <Skeleton width="85%" height="0.875rem" />
    </div>
  );
}

interface SkeletonPanelProps {
  className?: string;
}

export function SkeletonPanel(props: SkeletonPanelProps) {
  return (
    <div class={`kawaii-panel p-4 ${props.className || ''}`}>
      <Skeleton width="50%" height="1rem" className="mb-4" />
      <div class="space-y-3">
        <div>
          <Skeleton width="30%" height="0.875rem" className="mb-2" />
          <Skeleton width="100%" height="6rem" rounded="md" />
        </div>
        <div>
          <Skeleton width="30%" height="0.875rem" className="mb-2" />
          <Skeleton width="100%" height="8rem" rounded="md" />
        </div>
      </div>
    </div>
  );
}

interface SkeletonTableRowProps {
  columns?: number;
  className?: string;
}

export function SkeletonTableRow(props: SkeletonTableRowProps) {
  const columns = props.columns || 3;
  return (
    <div class={`kawaii-card p-4 flex items-center justify-between ${props.className || ''}`}>
      <div class="flex items-center gap-3 flex-1">
        <Skeleton width="2.5rem" height="2.5rem" rounded="full" />
        <div class="flex-1">
          <Skeleton width="40%" height="1rem" className="mb-1" />
          <Skeleton width="30%" height="0.75rem" />
        </div>
      </div>
      <div class="flex gap-2">
        <Skeleton width="4rem" height="1.875rem" rounded="sm" />
        <Skeleton width="4rem" height="1.875rem" rounded="sm" />
      </div>
    </div>
  );
}
