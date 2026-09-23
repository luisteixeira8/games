import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig(({ mode }) => {
  const runtime = globalThis as { process?: { env?: Record<string, string | undefined> } };
  const repositoryName = runtime.process?.env?.GITHUB_REPOSITORY?.split('/')[1] ?? 'stack-tower';
  const base = runtime.process?.env?.VITE_BASE_PATH ?? (mode === 'production' ? `/${repositoryName}/` : '/');

  return {
    base,
    plugins: [
      react(),
      VitePWA({
        registerType: 'prompt',
        scope: base,
        base,
        includeAssets: ['favicon.svg', 'icon.svg'],
        manifest: {
          name: 'Stack Tower',
          short_name: 'Stack Tower',
          description: 'Stack with precision and build the tallest tower.',
          lang: 'en-US',
          theme_color: '#090b18',
          background_color: '#090b18',
          display: 'standalone',
          orientation: 'portrait-primary',
          start_url: base,
          scope: base,
          icons: [
            {
              src: 'icon.svg',
              sizes: 'any',
              type: 'image/svg+xml',
              purpose: 'any maskable'
            }
          ]
        },
        workbox: {
          navigateFallback: `${base}index.html`,
          globPatterns: ['**/*.{js,css,html,svg,woff2}']
        }
      })
    ],
    test: {
      environment: 'jsdom',
      setupFiles: './src/test/setup.ts',
      coverage: { reporter: ['text', 'html'] }
    }
  };
});
