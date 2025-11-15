import { useNavigate } from '@solidjs/router';

interface TranslationEditorHeaderProps {
  projectId: string;
  language: string;
  filename?: string;
  completionPercentage: number;
  onMenuToggle: () => void;
  showMobileMenu: boolean;
}

export default function TranslationEditorHeader(props: TranslationEditorHeaderProps) {
  const navigate = useNavigate();

  return (
    <div class="bg-white border-b sticky top-0 z-30">
      <div class="max-w-7xl mx-auto px-4 py-3">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-3">
            {/* Hamburger Menu Button - Mobile Only */}
            <button
              onClick={props.onMenuToggle}
              class="lg:hidden p-2 hover:bg-gray-100 active:bg-gray-200 rounded transition"
              aria-label="Menu"
            >
              <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <div>
              <h1 class="text-xl lg:text-2xl font-bold text-gray-900">Translation Editor</h1>
              <p class="text-xs lg:text-sm text-gray-600">
                {props.projectId} • {props.language.toUpperCase()}
                {props.filename && <span> • <code class="text-xs bg-gray-100 px-1 py-0.5 rounded">{props.filename}</code></span>}
              </p>
            </div>
          </div>
          <div class="flex items-center gap-2 lg:gap-4">
            <div class="text-right">
              <div class="text-xs lg:text-sm text-gray-600">Progress</div>
              <div class="text-lg lg:text-2xl font-bold text-blue-600">{props.completionPercentage}%</div>
            </div>
            <button
              onClick={() => navigate('/dashboard')}
              class="px-3 py-2 text-sm lg:text-base text-gray-700 hover:bg-gray-100 active:bg-gray-200 rounded transition"
            >
              <span class="hidden sm:inline">Back to Dashboard</span>
              <span class="sm:hidden">Back</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
