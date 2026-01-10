import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { readFileSync } from 'fs';

// 🔥 从 package.json 读取版本号
const packageJson = JSON.parse(readFileSync('./package.json', 'utf-8'));
const APP_VERSION = packageJson.version;

export default defineConfig({
  plugins: [react()],
  base: './',
  server: {
    port: 5173,
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
  // 🔥 注入版本号到环境变量
  define: {
    'import.meta.env.VITE_APP_VERSION': JSON.stringify(APP_VERSION),
  },
});
