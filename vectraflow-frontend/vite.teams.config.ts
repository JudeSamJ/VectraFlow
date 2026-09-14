import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Separate build target for the Microsoft Teams tab shell — deliberately
// its own config file rather than a second entry in vite.config.ts, so the
// standalone web app's `npm run build` / `npm run dev` behavior is entirely
// untouched. Builds only teams.html (see src/teams-entry.tsx / TeamsApp.tsx)
// into its own output directory.
export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'dist-teams',
    rollupOptions: {
      input: {
        teams: 'teams.html',
      },
    },
  },
})
