import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './styles/globals.css'
import { TeamsApp } from './TeamsApp.tsx'

// Separate mount point from main.tsx/App.tsx — this file is the entry for
// the Teams tab build target only (see teams.html, vite.teams.config.ts)
// and is never imported by the standalone web app.
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <TeamsApp />
  </StrictMode>,
)
