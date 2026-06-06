import { resolve } from 'node:path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [tailwindcss(), react()],
  build: {
    rollupOptions: {
      input: {
        app: resolve(__dirname, 'index.html'),
        chimiolab: resolve(__dirname, 'chimiolab/index.html'),
        reactifs: resolve(__dirname, 'chimiolab/reactifs.html'),
        materiels: resolve(__dirname, 'chimiolab/materiels.html'),
        tp: resolve(__dirname, 'chimiolab/tp.html'),
        about: resolve(__dirname, 'chimiolab/about.html'),
      },
    },
  },
})
