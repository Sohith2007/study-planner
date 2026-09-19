import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import { App } from './app/App'
import { bootstrap } from './app/bootstrap'

// Seed before the first render so every page sees data on its first live query.
bootstrap().then((boot) => {
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App boot={boot} />
    </StrictMode>,
  )
})
