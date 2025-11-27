export function LoadingSpinner(props: { size?: 'sm' | 'md' | 'lg'; text?: string }) {
  const sizes = {
    sm: { spinner: '1.5rem', border: '2px' },
    md: { spinner: '2.5rem', border: '3px' },
    lg: { spinner: '3.5rem', border: '4px' }
  };
  
  const size = sizes[props.size || 'md'];

  return (
    <div style={{
      display: 'flex',
      'align-items': 'center',
      'justify-content': 'center',
      padding: '2rem'
    }}>
      <div style={{
        display: 'flex',
        'flex-direction': 'column',
        'align-items': 'center',
        gap: '1rem'
      }}>
        <div
          class="animate-spin"
          style={{
            width: size.spinner,
            height: size.spinner,
            border: `${size.border} solid var(--border)`,
            'border-top-color': 'var(--accent)',
            'border-radius': '50%'
          }}
          role="status"
          aria-label="Loading"
        />
        {props.text !== '' && (
          <p style={{ 'font-size': '0.9375rem', color: 'var(--text-secondary)' }}>
            {props.text || 'Loading...'}
          </p>
        )}
      </div>
    </div>
  );
}
