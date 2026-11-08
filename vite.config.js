import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Vite збирає React-застосунок у статичні файли (папка dist/).
// Vercel роздає dist/ як сайт, а файли з папки api/ запускає як Node.js-функції.
export default defineConfig({
  plugins: [react()],
});
