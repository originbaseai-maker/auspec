import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { useAuthStore } from '@/store/useAuthStore'
import { preloadAllAppFonts } from '@/lib/fontLoader'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

useAuthStore.getState().initialize()

// Kick off font fetches in the background so the very first canvas
// frame that uses a less-common family (e.g. Press Start 2P) draws
// with the real glyphs instead of the Times-New-Roman fallback.
// Non-blocking — auth init and the React mount don't wait on this.
void preloadAllAppFonts()
