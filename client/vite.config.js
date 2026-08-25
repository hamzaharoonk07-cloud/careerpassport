import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    // Bound to every interface, not just loopback. Without this Vite
    // listens on [::1] alone and a phone on the same Wi-Fi cannot reach
    // the dev server at all — every request simply fails to connect.
    host: true,
    port: 5273,
    strictPort: true,
    proxy: {
      // Keeps cookies same-origin in dev, so httpOnly auth cookies just work.
      '/api': { target: 'http://localhost:5000', changeOrigin: true },
    },
  },
  build: {
    target: 'es2020',
    cssCodeSplit: true,
    rollupOptions: {
      output: {
        manualChunks: { react: ['react', 'react-dom', 'react-router-dom'] },
      },
    },
  },
});
