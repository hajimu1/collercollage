import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  base: './',
  experimental: {
    renderBuiltUrl(_filename, { type }) {
      if (type === 'public') {
        return { relative: true };
      }
    },
  },
  build: {
    emptyOutDir: true,
    chunkSizeWarningLimit: 900,
  },
});
