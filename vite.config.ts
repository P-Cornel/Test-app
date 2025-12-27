
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  define: {
    // This bridges the Netlify environment variable into your code
    'process.env.API_KEY': JSON.stringify(process.env.API_KEY),
  },
  build: {
    outDir: 'dist',
    target: 'esnext'
  }
});
