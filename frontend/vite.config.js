import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react({ include: /\.(js|jsx|ts|tsx)$/ })],
  esbuild: {
    loader: 'jsx',
    include: /src\/.*\.(js|jsx)$/,
    exclude: [],
  },
  optimizeDeps: {
    esbuildOptions: {
      loader: { '.js': 'jsx' },
    },
  },
  server: {
    port: parseInt(process.env.FRONTEND_PORT || '3000', 10),
    proxy: {
      '/api': process.env.VITE_API_URL || `http://127.0.0.1:${process.env.BACKEND_PORT || '3001'}`
    }
  }
});
