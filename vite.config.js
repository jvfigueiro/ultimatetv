import { defineConfig } from 'vite';
import legacy from '@vitejs/plugin-legacy';

export default defineConfig({
  plugins: [
    legacy({
      targets: [
        'Chrome >= 30',
        'Safari >= 6',
        'iOS >= 6',
        'IE >= 11',
        '> 0.2%',
        'not dead'
      ],
      polyfills: true,
      additionalLegacyPolyfills: ['regenerator-runtime/runtime']
    })
  ],
  build: {
    target: 'es2015',
    minify: 'terser'
  }
});
