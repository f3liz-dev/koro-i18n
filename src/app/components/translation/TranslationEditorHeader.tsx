import { useNavigate } from '@solidjs/router';

interface TranslationEditorHeaderProps {
  projectId: string;
  language: string;
  filename?: string;
  completionPercentage: number;
  onMenuToggle: () => void;
  showMobileMenu: boolean;
}

export function TranslationEditorHeader(props: TranslationEditorHeaderProps) {
  const navigate = useNavigate();

  return (
    <div class="panel border-b" style={{ position: 'sticky', top: '0', 'z-index': '30', 'border-radius': '0' }}>
      <div class="container" style={{ display: 'flex', 'align-items': 'center', 'justify-content': 'space-between', padding: '0.75rem 0' }}>
        <div style={{ display: 'flex', 'align-items': 'center', gap: '0.75rem' }}>
          {/* Mobile menu button */}
          <button
            onClick={props.onMenuToggle}
            class="btn ghost lg:hidden"
            style={{ padding: '0.5rem' }}
            aria-label="Menu"
          >
            ☰
          </button>
          <div>
            <h1 style={{ 'font-size': '1.125rem', 'font-weight': '600' }}>Translation Editor</h1>
            <p style={{ 'font-size': '0.75rem', color: 'var(--text-secondary)' }}>
              {props.projectId} • {props.language.toUpperCase()}
              {props.filename && <span> • <code class="code-chip">{props.filename}</code></span>}
            </p>
          </div>
        </div>
        <div style={{ display: 'flex', 'align-items': 'center', gap: '1rem' }}>
          <div style={{ 'text-align': 'right' }}>
            <div style={{ 'font-size': '0.75rem', color: 'var(--text-secondary)' }}>Progress</div>
            <div style={{ 'font-size': '1.25rem', 'font-weight': '700', color: 'var(--accent)' }}>{props.completionPercentage}%</div>
          </div>
          <button onClick={() => navigate('/dashboard')} class="btn ghost">
            Back
          </button>
        </div>
      </div>
    </div>
  );
}
