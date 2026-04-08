import { defineConfig } from 'vite';

export default defineConfig({
  root: '.',
  server: {
    port: 3000,
    open: true,
    // 指定主 HTML 文件
    fsServe: {
      main: 'Main.html'
    }
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
    rollupOptions: {
      input: {
        main: './Main.html'
      }
    }
  },
  resolve: {
    alias: {
      'src': '/src'
    }
  }
});

