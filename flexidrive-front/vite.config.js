import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd())
  return {
    plugins: [react()],
    define: {
      __GMAPS_KEY__: JSON.stringify(env.VITE_GOOGLE_MAPS_KEY),
    },
  }
})