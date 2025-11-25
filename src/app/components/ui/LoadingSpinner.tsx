export function LoadingSpinner() {
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
          style={{
            width: '2.5rem',
            height: '2.5rem',
            border: '3px solid var(--border)',
            'border-top-color': 'var(--accent)',
            'border-radius': '50%',
            animation: 'spin 0.8s linear infinite'
          }}
          role="status"
          aria-label="Loading"
        />
        <p style={{ 'font-size': '0.875rem', color: 'var(--text-secondary)' }}>Loading...</p>
      </div>
      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
