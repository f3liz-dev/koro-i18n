import { defineConfig, presetWind4, presetAttributify, presetTypography } from 'unocss'

export default defineConfig({
  presets: [
    presetWind4(),
    presetAttributify(),
    presetTypography(),
  ],
  theme: {
    colors: {
      primary: {
        50: '#fef7ee',
        100: '#fdecd3',
        200: '#fad5a5',
        300: '#f7b56d',
        400: '#f38b33',
        500: '#f06a0b',
        600: '#e14f01',
        700: '#ba3904',
        800: '#942e0a',
        900: '#78270b',
        950: '#411206',
      },
      accent: {
        50: '#fef3f2',
        100: '#fde5e2',
        200: '#fbcfc9',
        300: '#f8afa4',
        400: '#f18170',
        500: '#e65845',
        600: '#d13a27',
        700: '#b02e1e',
        800: '#92291c',
        900: '#7a281e',
        950: '#42110b',
      },
    },
  },
})
