import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // amazon-cognito-identity-js references Node's `global`, which does not
  // exist in the browser bundle.
  define: {
    global: 'globalThis',
  },
  server: {
    port: 7867,
  },
  preview: {
    port: 7867,
  },
})
