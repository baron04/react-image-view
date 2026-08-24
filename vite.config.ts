import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  root: 'playground',
  plugins: [react()],
  // `host: true` binds the LAN interface as well as localhost, so the
  // playground can be opened from a phone — the only way to judge the touch
  // gestures this component exists for.
  server: { port: 5180, host: true },
})
