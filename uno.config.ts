import { defineConfig, presetWind4, presetAttributify, presetTypography } from 'unocss'

export default defineConfig({
  presets: [
    presetWind4(),
    presetAttributify(),
    presetTypography(),
  ],
  theme: {
    colors: {
      // Kawaii Cat Theme Palette
      // Primary: Soft Warm Orange (Cat fur)
      primary: {
        50: '#fff8f0',
        100: '#ffebd4',
        200: '#ffd4a8',
        300: '#ffb670',
        400: '#ff9133',
        500: '#ff7300', // Main brand color
        600: '#e65c00',
        700: '#cc4a00',
        800: '#a33600',
        900: '#802800',
        950: '#4d1400',
      },
      // Secondary: Soft Pink (Paws/Nose)
      secondary: {
        50: '#fff0f5',
        100: '#ffe3ec',
        200: '#ffc7d9',
        300: '#ff9bb8',
        400: '#ff6691',
        500: '#ff3366',
        600: '#e61e50',
        700: '#cc1240',
        800: '#a30a30',
        900: '#800523',
        950: '#4d0012',
      },
      // Neutral: Warm Grays (Backgrounds)
      neutral: {
        50: '#faf9f7',
        100: '#f5f2ee',
        200: '#e6e2dc',
        300: '#d1ccc6',
        400: '#9e9994',
        500: '#706c67',
        600: '#524e4a',
        700: '#3b3835',
        800: '#262422',
        900: '#171615',
        950: '#0d0c0c',
      },
      // Semantic
      success: '#4ade80', // Soft Green
      warning: '#fbbf24', // Soft Yellow
      error: '#f87171',   // Soft Red
      info: '#60a5fa',    // Soft Blue
    },
    fontFamily: {
      sans: ['"Zen Maru Gothic"', 'ui-sans-serif', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'Helvetica Neue', 'Arial', 'sans-serif'],
      serif: ['"Kiwi Maru"', 'ui-serif', 'Georgia', 'Cambria', 'Times New Roman', 'Times', 'serif'],
      mono: ['"Fira Code"', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'Monaco', 'Consolas', 'Liberation Mono', 'Courier New', 'monospace'],
    },
  },
  shortcuts: {
    'btn-primary': 'px-4 py-2 rounded-full bg-primary-400 hover:bg-primary-500 text-white font-bold shadow-sm transition-all duration-200 active:scale-95 flex items-center gap-2',
    'btn-secondary': 'px-4 py-2 rounded-full bg-secondary-100 text-secondary-700 hover:bg-secondary-200 font-bold transition-all duration-200 active:scale-95 flex items-center gap-2',
    'card': 'bg-white rounded-2xl shadow-sm border border-neutral-100 p-6',
    'input': 'w-full px-4 py-2 rounded-xl border border-neutral-200 focus:border-primary-400 focus:ring-2 focus:ring-primary-100 outline-none transition-all duration-200 bg-neutral-50 focus:bg-white',
  },
})
