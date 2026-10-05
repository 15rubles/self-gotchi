import { defineConfig, minimal2023Preset } from '@vite-pwa/assets-generator/config'

// PNG app icons (any / maskable / apple-touch) generated from public/favicon.svg at build time.
export default defineConfig({
  headLinkOptions: { preset: '2023' },
  preset: minimal2023Preset,
  images: ['public/favicon.svg'],
})
