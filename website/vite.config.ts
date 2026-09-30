import { defineConfig } from 'vite';
import { sveltekit } from '@sveltejs/kit/vite';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  tsconfig: './tsconfig.json',
  plugins: [tailwindcss(), sveltekit()]
});
