import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { devRunner } from './dev/devRunner.ts'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), devRunner()],
})
