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
  // `vite preview` does not inherit server.proxy, so the built app served
  // this way sent /api straight at the static server and got a 404 back —
  // the page rendered fine and only the login failed, which reads as broken
  // auth rather than a missing proxy.
  preview: {
    host: true,
    port: 4173,
    proxy: {
      '/api': { target: 'http://localhost:5000', changeOrigin: true },
    },
  },

  build: {
    // Written to the repository root rather than client/dist.
    //
    // Vercel's Vite preset looks for a directory called `dist` next to the
    // build command, and a project-level Output Directory setting overrides
    // whatever vercel.json says — so `client/dist` was built successfully
    // and then reported missing. Emitting where the platform already looks
    // removes the disagreement instead of trying to win it from settings.
    outDir: '../dist',
    // Vite refuses to clear a directory outside its root without this, so
    // stale files from an earlier build would otherwise be served forever.
    emptyOutDir: true,
    target: 'es2020',
    cssCodeSplit: true,
    rollupOptions: {
      output: {
        manualChunks: { react: ['react', 'react-dom', 'react-router-dom'] },
      },
    },
  },
});
