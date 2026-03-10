import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import SetupExtend from 'vite-plugin-vue-setup-extend'
import { fileURLToPath, URL } from 'node:url'

// https://vite.dev/config/
export default defineConfig({
  plugins: [vue(), SetupExtend()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    }
  },
  server: {
    host: '0.0.0.0', // 监听所有网络地址（关键）
    port: 5173,      // 固定端口5173（可选）
    open: true,      // 启动时不自动打开浏览器（可选）
    allowedHosts: true, // 允许所有的 host 访问（解决内网穿透报错问题）
    proxy: {
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, '')
      }
    }
  }
})
