import { defineConfig, presetWind4, presetAttributify, presetTypography } from 'unocss'

export default defineConfig({
  presets: [
    presetWind4(),
    presetAttributify(),
    presetTypography(),
  ],
  // Custom theme to match the existing design
  theme: {
    colors: {
      // Using default UnoCSS colors which are similar to Tailwind
    },
  },
})
