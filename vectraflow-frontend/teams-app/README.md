# VectraFlow Teams tab

Scaffold for embedding VectraFlow's chat UI as a Microsoft Teams static tab.
This directory holds only the Teams **app package** inputs (manifest + icons)
— the tab's actual content is the `teams.html` / `src/TeamsApp.tsx` build
target in the frontend project (`npm run build:teams`, output in
`dist-teams/`), which reuses the same chat components as the standalone web
app without touching its routing or build.

## What's here

- `manifest.json` — Teams app manifest (schema v1.17), one `staticTab`
  pointing at `/teams.html` on the deployed frontend host.
- `color.png` / `outline.png` — placeholder icons (192×192 color, 32×32
  transparent outline). Replace with real branded icons before publishing;
  Teams enforces both the size and the outline icon's transparent
  background.

## Before sideloading

1. Deploy `dist-teams/` (from `npm run build:teams`) to the same host as the
   rest of the frontend, so `teams.html` is reachable alongside `index.html`
   — `TeamsApp` relies on that shared origin for the sign-in handoff via
   `localStorage` (see the comment in `src/TeamsApp.tsx`).
2. Replace every `REPLACE_WITH_DEPLOYED_HOSTNAME` placeholder in
   `manifest.json` with the real hostname, and generate a real `id` GUID for
   the app (e.g. `uuidgen`).
3. `webApplicationInfo` is only needed once you wire up full Teams SSO
   (`authentication.getAuthToken`) via an Entra app registration exposed as
   an API — the current tab uses a simpler popup sign-in against the
   existing `/auth/entra/login` endpoint (Step 3) and doesn't require it.
   Leave the placeholders, or remove the `webApplicationInfo` block
   entirely, until that upgrade is made.
4. Zip `manifest.json`, `color.png`, and `outline.png` together (flat, no
   subfolder) and upload it via Teams Admin Center or "Upload a custom app"
   in the Teams client to sideload/test.

## Known limitations of this scaffold

- Sign-in is a simple popup + localStorage poll, not full Teams silent SSO —
  it works but will show a "Sign in with Microsoft" button on first load in
  a given Teams session rather than signing in silently. See the comment in
  `SignInGate` (`src/TeamsApp.tsx`) for the upgrade path.
- No `configurableTabs` — this is a single fixed `staticTab`, since there's
  only one knowledge-assistant experience to expose.
