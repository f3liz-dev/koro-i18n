import { defineConfig } from 'rolldown'
import nodePolyfills from '@rolldown/plugin-node-polyfills'
 
export default defineConfig({
  input: ["index.js"],
  output: {
    "dir": "dist"
  },
  platform: "browser",
  plugins: [nodePolyfills()]
})