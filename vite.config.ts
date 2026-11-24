import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

// Relative base works on both GitHub Pages subpaths (/runetamer-labyrinth/) and Cloudflare Pages root domains
export default defineConfig({
  base: './',
  plugins: [react()],
});
