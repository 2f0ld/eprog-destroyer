import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { devRunner } from './dev/devRunner.ts'
import { accountsDev } from './server/devPlugin.ts'

// https://vite.dev/config/
export default defineConfig({
  // accounts first: its middleware guards the runner's /api routes (login wall)
  plugins: [react(), accountsDev(), devRunner()],
  build: {
    // two pages: the IDE (index.html) and the auth pages (auth.html), see server/api.ts
    rolldownOptions: { input: { main: 'index.html', auth: 'auth.html' } },
  },
})
