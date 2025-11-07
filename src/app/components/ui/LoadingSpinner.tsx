import { Component } from 'solid-js';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  text?: string;
}

const LoadingSpinner: Component<LoadingSpinnerProps> = (props) => {
  const size = () => props.size || 'md';
  const text = () => props.text || 'Loading...';

  const sizeClasses = () => {
    switch (size()) {
      case 'sm':
        return 'w-4 h-4';
      case 'lg':
        return 'w-8 h-8';
      default:
        return 'w-6 h-6';
    }
  };

  return (
    <div class="loading">
      <div class="flex flex-col items-center gap-md">
        <div class={`spinner ${sizeClasses()}`} />
        <span class="text-sm text-muted">{text()}</span>
      </div>
    </div>
  );
};

export default LoadingSpinner;