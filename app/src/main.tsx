import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import { App } from './app/App'
import { bootstrap } from './app/bootstrap'
import { initTheme } from './app/theme'

// Dark mode follows prefers-color-scheme (adds .dark on <html>).
initTheme()

// Seed before the first render so every page sees data on its first live query.
bootstrap().then((boot) => {
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App boot={boot} />
    </StrictMode>,
  )
})
