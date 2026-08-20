# Kindling redesign — design spec

Date: 2026-08-20
Status: approved by user, ready for implementation planning

## Summary

Rename ShareRoom to **Kindling**, replace the Discord-referenced dark visual
language with a calmer, Kindle-inspired design system (light "paper" theme +
warm dark theme, toggleable), and split the codebase's two accumulated
monoliths — `App.css` (1248 lines) and the single-bundle JS — into
per-component fragments, so the app can keep growing features without
becoming harder to navigate or slower to load.

This is a visual/structural refactor of an existing, working, in-production
app. No functional/behavioral changes to screen sharing, audio, room
identity, or LiveKit integration. Existing decisions documented in
[[project-shareroom-overview]] (deviceId identity, volume/nickname
persistence, sanitizer split, quality presets, simulcast, focus behavior,
clipboard fallback) all stay exactly as they are — this spec only touches
naming, visuals, CSS organization, and JS chunking.

## Goals

- New name "Kindling" applied everywhere user-visible (title, wordmark, Home
  screen, `package.json`, meta tags). Room URLs/slugs are unaffected —
  existing shared links keep working.
- A calm, low-saturation, Kindle-inspired visual identity, in both light
  ("paper") and dark ("warm night") variants, user-toggleable, defaulting to
  system preference.
- Simple, restrained animation throughout (no bounce/spring, ≤200ms,
  `prefers-reduced-motion` respected).
- `App.css` split into token/base/animation globals plus one CSS file
  per component, co-located with its `.jsx`.
- JS split so the LiveKit SDK and Room UI aren't downloaded until a user
  actually enters a room, and `SettingsModal` isn't downloaded until opened.
- No new dependencies (no CSS framework, no animation library, no webfonts) —
  stays pure CSS and system fonts, consistent with the project's existing
  "no framework" convention.
- Existing Discord-like structural layout (sidebar participant list + central
  stage + bottom control dock) is kept as-is — this is a re-skin, not a
  re-architecture of layout.

## Non-goals

- No change to LiveKit integration, token minting (`token.cjs`), WebRTC
  behavior, quality presets, or any of the bug-fix protections already in
  place (try/catch around `setVolume`, `participantKey`-keyed effect,
  3-layer ErrorBoundary).
- No new automated test suite — the project has none today and adding one is
  out of scope for a visual/structural refactor.
- No multi-room UI, presence system, text channels, or authentication (still
  explicitly out of scope per existing project decisions).

## Visual identity & design tokens

**Naming:** "ShareRoom" → "Kindling" in `index.html` `<title>`, meta tags,
`package.json` `name`, the Home screen wordmark, and any other user-facing
string. Internal identifiers (room slugs, deviceId, localStorage keys) are
untouched to avoid breaking anything already deployed.

**Palette** — two themes, same structure, different lightness:

| Token | Light ("paper") | Dark ("warm night") |
|---|---|---|
| `--bg` | `#F6F1E4` | `#26221D` |
| `--bg-elevated` | slightly lighter/darker step for cards/panels | same direction |
| `--text` | `#2B2620` | `#EDE6D8` |
| `--text-muted` | dimmed step of `--text` | dimmed step of `--text` |
| `--border` | subtle warm sand, low contrast | subtle warm graphite, low contrast |
| `--accent` | `#C9702D` (ember/amber) | same hue, tuned for dark contrast |
| `--accent-text` | text color placed on `--accent` | same |

Deliberately warm-neutral, not Discord's cool gray/blurple. One accent color
used sparingly (speaking indicator, primary actions, focus rings) — not a
multi-color role/badge system.

**Typography:** system font stacks only — no webfont loading (keeps the app
light, no extra network request). Serif system stack (Georgia / Iowan Titling
/ Times, with generic `serif` fallback) for the wordmark and room name.
Sans-serif system stack for all functional UI (buttons, labels, participant
list, settings).

**Animation:** all transitions ≤200ms, `ease-out`, no spring/bounce/elastic
easing. Modal/panel entry: fade + 8–12px slide, not scale/zoom. Speaking
indicator: opacity pulse, not scale pulse. Every animation respects
`prefers-reduced-motion: reduce` (falls back to instant/no transition).

## Theme system

- `:root` defines the **light** theme tokens as default.
- `[data-theme="dark"]` on `<html>` overrides the same custom properties with
  dark values.
- First visit with no saved preference: resolved from
  `prefers-color-scheme`. After a manual toggle, the explicit choice is
  saved to `localStorage` (same convention as `useFriendPrefs.js`) and wins
  over system preference from then on.
- **FOUC prevention:** a small inline, blocking `<script>` in `index.html`
  (before the app bundle loads) reads `localStorage`/`matchMedia` and sets
  `data-theme` on `<html>` synchronously, so there's no flash of the wrong
  theme before React mounts.
- New hook `src/hooks/useTheme.js` (same shape as `useDeviceId.js`): exposes
  `{ theme, toggleTheme }`, writes the user's explicit choice to
  `localStorage` inside a `try/catch` (per the project's existing
  browser-API-safety convention — see [[feedback-shareroom-style]]), and
  keeps `data-theme` in sync with React state after the initial boot script
  has already set it once.
- Toggle control lives in `SettingsModal` (with the other preferences) plus a
  quick-access icon in `ControlDock`.

## CSS fragmentation

Replaces the single 1248-line `App.css`:

```
src/styles/
  tokens.css       # :root light tokens + [data-theme="dark"] overrides
  base.css         # reset, global typography, page-level layout
  animations.css   # shared keyframes + transition utility classes
src/components/
  ControlDock.css       # co-located with ControlDock.jsx
  ParticipantList.css
  SettingsModal.css
  Stage.css
  ErrorBoundary.css     # only if it has meaningful styles of its own
src/pages/
  Home.css
  Room.css
```

Each `.jsx` imports its own co-located `.css`; `tokens.css`, `base.css`, and
`animations.css` are imported once, globally, in `main.jsx`. Co-location was
chosen over a shared `styles/components/` directory because bundling is
driven by the JS import graph and `React.lazy()` boundaries, not by folder
location — performance is identical either way — while co-location keeps
each component a self-contained, deletable unit instead of growing a second
loosely-organized directory.

## JS fragmentation (code-splitting)

- `App.jsx`: `Home` and `Room` become `React.lazy()` imports. Only one loads
  per visit (routing is by presence of `?room=`), and since only `Room`
  pulls in the LiveKit SDK, visitors who are just creating/joining a room
  don't download the WebRTC stack until they actually enter one.
- `SettingsModal` (used from `Room.jsx`): `React.lazy()`, since it only
  mounts when opened.
- `ControlDock`, `ParticipantList`, `Stage`, `ErrorBoundary` stay eager —
  they're needed on first render of a room; lazy-loading them would only add
  a loading flash with no benefit.
- Every `Suspense` boundary sits inside the existing `ErrorBoundary` layers
  (root, around `LiveKitRoom`) so a chunk-load failure (flaky network)
  degrades to the existing fallback UI instead of crashing the tree.
- `Suspense` fallback: a plain, low-key fade (using the new animation
  tokens), not a spinner.

## Migration order

Incremental — the app stays working and deployable after every step:

1. Add `src/styles/tokens.css` and `base.css` alongside the existing
   `App.css` (additive, nothing removed yet).
2. Add `useTheme.js`, the anti-FOUC inline script, and the toggle UI in
   `SettingsModal`/`ControlDock`.
3. Migrate component-by-component: move each component's slice of styles
   out of `App.css` into its co-located `.css` using the new tokens, verify
   visually in both themes, then delete that slice from `App.css`.
4. Delete `App.css` once empty.
5. Apply the "Kindling" rename across user-facing strings and
   `package.json` — independent of the CSS work, low risk, can land at any
   point in the sequence.
6. Add `React.lazy()`/`Suspense` splitting for `Home`/`Room`/`SettingsModal`
   last, since it's orthogonal to the visual work and easiest to verify in
   isolation (Network panel shows separate chunks; app still functions).

## Verification

No automated test suite exists in this project and adding one is out of
scope here. Verification is manual, in a running dev server, repeated at
each relevant migration step:

- Create a room, join from a second browser/profile, share a screen, confirm
  audio and volume controls still work
- Toggle light/dark theme, confirm no FOUC on reload in either theme
- Confirm system-preference default works when no explicit choice is saved
- Confirm reduced-motion setting suppresses animations
- After step 6, confirm in the Network panel that `Room`, `Home`, and
  `SettingsModal` load as separate chunks, and that a room-link visit does
  not fetch the `Home`-only chunk
