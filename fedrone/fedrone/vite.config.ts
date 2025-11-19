import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import legacy from '@vitejs/plugin-legacy';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    // Hỗ trợ trình duyệt cũ (một số điện thoại không chạy được ESM hiện đại)
    legacy({
      targets: ['defaults', 'not IE 11'],
      renderLegacyChunks: true,
      polyfills: true,
      modernPolyfills: true,
    }),
  ],
  build: {
    // Nhắm tới mức tương thích rộng hơn cho mobile cũ
    target: 'es2018',
  },
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
});
