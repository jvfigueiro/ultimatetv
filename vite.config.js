import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [],
  build: {
    target: 'esnext',
    minify: 'terser',
    rollupOptions: {
      input: {
        main: './index.html',
        settings: './settings.html'
      }
    }
  }
});
