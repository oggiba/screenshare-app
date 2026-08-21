# Kindling Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rename ShareRoom to Kindling, replace its dark Discord-referenced visual system with a calm Kindle-inspired light/dark design (pure CSS, no new dependencies), split `App.css` (1248 lines) into per-component files, and code-split the JS bundle so the LiveKit SDK only loads once a user enters a room.

**Architecture:** Token-driven theming (existing 20 CSS custom property names keep their names, only their values move into a new `tokens.css` with a `[data-theme="dark"]` override block), so every existing component rule keeps working unchanged as it's relocated. CSS is extracted from `App.css` into co-located per-component files without behavior change. `React.lazy()` splits `Home`/`Room`/`SettingsModal` into separate chunks behind the existing `ErrorBoundary`.

**Tech Stack:** React 18 + Vite 5, plain CSS custom properties (no CSS framework/animation library/webfonts), no test runner in this project (manual browser verification only).

**Spec:** [docs/superpowers/specs/2026-08-20-kindling-redesign-design.md](../specs/2026-08-20-kindling-redesign-design.md)

## Global Constraints

- No new npm dependencies (no CSS framework, no animation library, no webfont loading) — pure CSS and system font stacks only.
- Every browser-API call this plan touches (`localStorage`) must be wrapped in `try/catch`, matching the existing convention in `src/hooks/useDeviceId.js`.
- All transitions ≤200ms, `ease-out`, no spring/bounce easing; everything respects `prefers-reduced-motion: reduce`.
- Internal identifiers — room slugs, `deviceId`, every `localStorage` key prefixed `sr_` — are NOT renamed. Renaming them would silently wipe every existing user's saved volume/nickname/quality preferences on next deploy. Only user-visible strings and the package name change.
- Existing token names (`--bg-base`, `--bg-card`, `--bg-elevated`, `--bg-hover`, `--bg-stage`, `--accent`, `--accent-glow`, `--accent-dark`, `--success`, `--warning`, `--danger`, `--speaking`, `--text-primary`, `--text-secondary`, `--text-muted`, `--border`, `--border-strong`, `--border-accent`, `--radius`, `--radius-sm`, `--font`, `--sidebar-w`, `--dock-h`) are preserved as-is; only their values change. Two new tokens are added: `--font-serif`, `--font-mono`, `--accent-text`.
- No automated test suite exists and adding one is out of scope. Every task ends with a manual verification step: run `npm run dev`, open the app, check the specific behavior in that task.

---

## Token values (used throughout this plan)

**Light theme ("paper") — new `:root` defaults:**
```css
--bg-base: #F6F1E4;
--bg-card: #EFE7D2;
--bg-elevated: #E8DFC7;
--bg-hover: #DED2B3;
--bg-stage: #33291E;
--accent: #C9702D;
--accent-glow: rgba(201, 112, 45, 0.22);
--accent-dark: #A85A20;
--accent-text: #FFFFFF;
--success: #4C8B5B;
--warning: #B8862E;
--danger: #B24444;
--speaking: #4C8B5B;
--text-primary: #2B2620;
--text-secondary: #6B6151;
--text-muted: #9C927C;
--border: rgba(43, 38, 32, 0.10);
--border-strong: rgba(43, 38, 32, 0.20);
--border-accent: rgba(201, 112, 45, 0.35);
--radius: 12px;
--radius-sm: 8px;
--font: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
--font-serif: Georgia, "Iowan Old Style", "Palatino Linotype", "Book Antiqua", serif;
--font-mono: ui-monospace, "SFMono-Regular", Menlo, Consolas, "Liberation Mono", monospace;
--sidebar-w: 260px;
--dock-h: 68px;
```

**Dark theme ("warm night") — `[data-theme="dark"]` overrides (same names, only these change):**
```css
--bg-base: #26221D;
--bg-card: #2E2921;
--bg-elevated: #383026;
--bg-hover: #443A2C;
--bg-stage: #17140F;
--accent: #D98A4A;
--accent-glow: rgba(217, 138, 74, 0.25);
--accent-dark: #B96F35;
--accent-text: #FFFFFF;
--success: #6FA87D;
--warning: #C99A4A;
--danger: #C96B62;
--speaking: #6FA87D;
--text-primary: #EDE6D8;
--text-secondary: #B8AD98;
--text-muted: #7D735F;
--border: rgba(255, 255, 255, 0.08);
--border-strong: rgba(255, 255, 255, 0.14);
--border-accent: rgba(217, 138, 74, 0.35);
```

**Standing substitution rules applied whenever CSS moves out of `App.css` in this plan:**
1. Every `font-family: "Fira Code", monospace;` becomes `font-family: var(--font-mono);`
2. Every literal `color: white;` on an element whose `background` is `var(--accent)` becomes `color: var(--accent-text);` (`.primary-btn`, `.invite-btn`, `.dock-btn.screen.sharing`, `.person-avatar`, `.avatar`). Literal `white` used for text drawn *over video* (`.tile-name`) stays literal — it sits on a dark gradient scrim over screen content, independent of page theme.
3. `.avatar.pulse` and `.person-card.speaking .person-avatar` each gain `animation: speakingPulse 1.6s ease-in-out infinite;` (new — replaces a purely static "speaking" indicator with the calm opacity pulse from the spec; the border/box-shadow speaking treatment stays as-is alongside it).

---

### Task 1: Global design tokens, base styles, remove webfont loading

**Files:**
- Create: `src/styles/tokens.css`
- Create: `src/styles/base.css`
- Create: `src/styles/animations.css`
- Modify: `src/main.jsx`
- Modify: `src/App.css:1-47` (delete — header comment, `:root`, reset, `html,body,#root`, `button`)
- Modify: `src/App.css` (delete the ESTADOS/ANIMAÇÕES/SCROLLBAR block, originally lines 1143-1223: `.loading-screen`/`.error-screen`/`.spinner`/`.error-actions` rules, the three `@keyframes`, and the `::-webkit-scrollbar*` rules)
- Modify: `index.html` (remove Google Fonts preconnect/stylesheet links, update `<title>`)

**Interfaces:**
- Produces: CSS custom properties consumed by every other file in this plan (`--bg-base`, `--accent`, etc. — full list above). `animations.css` produces `@keyframes spin`, `fadeIn`, `slideUp`, `speakingPulse`, all consumed by later tasks.

- [ ] **Step 1: Create `src/styles/tokens.css`**

```css
/* Kindling — design tokens.
   Tema claro ("papel") é o padrão em :root; [data-theme="dark"] sobrescreve
   os mesmos nomes de variável para o tema noturno. Ver
   docs/superpowers/specs/2026-08-20-kindling-redesign-design.md */

:root {
  --bg-base: #F6F1E4;
  --bg-card: #EFE7D2;
  --bg-elevated: #E8DFC7;
  --bg-hover: #DED2B3;
  --bg-stage: #33291E;

  --accent: #C9702D;
  --accent-glow: rgba(201, 112, 45, 0.22);
  --accent-dark: #A85A20;
  --accent-text: #FFFFFF;

  --success: #4C8B5B;
  --warning: #B8862E;
  --danger: #B24444;
  --speaking: #4C8B5B;

  --text-primary: #2B2620;
  --text-secondary: #6B6151;
  --text-muted: #9C927C;

  --border: rgba(43, 38, 32, 0.10);
  --border-strong: rgba(43, 38, 32, 0.20);
  --border-accent: rgba(201, 112, 45, 0.35);

  --radius: 12px;
  --radius-sm: 8px;

  --font: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
  --font-serif: Georgia, "Iowan Old Style", "Palatino Linotype", "Book Antiqua", serif;
  --font-mono: ui-monospace, "SFMono-Regular", Menlo, Consolas, "Liberation Mono", monospace;

  --sidebar-w: 260px;
  --dock-h: 68px;
}

[data-theme="dark"] {
  --bg-base: #26221D;
  --bg-card: #2E2921;
  --bg-elevated: #383026;
  --bg-hover: #443A2C;
  --bg-stage: #17140F;

  --accent: #D98A4A;
  --accent-glow: rgba(217, 138, 74, 0.25);
  --accent-dark: #B96F35;
  --accent-text: #FFFFFF;

  --success: #6FA87D;
  --warning: #C99A4A;
  --danger: #C96B62;
  --speaking: #6FA87D;

  --text-primary: #EDE6D8;
  --text-secondary: #B8AD98;
  --text-muted: #7D735F;

  --border: rgba(255, 255, 255, 0.08);
  --border-strong: rgba(255, 255, 255, 0.14);
  --border-accent: rgba(217, 138, 74, 0.35);
}
```

- [ ] **Step 2: Create `src/styles/base.css`**

```css
* { box-sizing: border-box; margin: 0; padding: 0; }

html, body, #root {
  height: 100%;
  background: var(--bg-base);
  color: var(--text-primary);
  font-family: var(--font);
  -webkit-font-smoothing: antialiased;
  overflow: hidden;
  transition: background-color 0.2s ease-out, color 0.2s ease-out;
}

button { font-family: var(--font); }

/* =========================================
   ESTADOS DE PÁGINA (carregando / erro)
   Usado por Room.jsx e por ErrorBoundary.jsx
   ========================================= */

.loading-screen,
.error-screen {
  min-height: 100dvh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 18px;
  text-align: center;
  padding: 24px;
}

.spinner {
  width: 38px;
  height: 38px;
  border: 3px solid var(--border);
  border-top-color: var(--accent);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

.error-screen h2 { font-size: 1.3rem; }
.error-screen p { color: var(--text-secondary); max-width: 380px; line-height: 1.6; }

.error-screen code {
  background: var(--bg-elevated);
  padding: 2px 7px;
  border-radius: 4px;
  color: var(--accent);
  font-size: 0.88rem;
}

.error-actions {
  display: flex;
  gap: 10px;
}

.error-screen button {
  padding: 10px 26px;
  background: var(--accent);
  border: none;
  border-radius: var(--radius-sm);
  color: var(--accent-text);
  font-weight: 600;
  cursor: pointer;
}

.error-screen button.ghost {
  background: transparent;
  border: 1px solid var(--border-strong);
  color: var(--text-secondary);
}

/* =========================================
   SCROLLBAR
   ========================================= */

::-webkit-scrollbar { width: 8px; height: 8px; }
::-webkit-scrollbar-track { background: transparent; }
::-webkit-scrollbar-thumb { background: var(--bg-hover); border-radius: 4px; }
::-webkit-scrollbar-thumb:hover { background: var(--border-strong); }
```

- [ ] **Step 3: Create `src/styles/animations.css`**

```css
@keyframes spin { to { transform: rotate(360deg); } }

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(-5px); }
  to   { opacity: 1; transform: translateY(0); }
}

@keyframes slideUp {
  from { opacity: 0; transform: translateY(12px) scale(0.98); }
  to   { opacity: 1; transform: translateY(0) scale(1); }
}

@keyframes speakingPulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.55; }
}

@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.001ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.001ms !important;
  }
}
```

- [ ] **Step 4: Wire the three new files into `src/main.jsx`**

```jsx
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.jsx";
import "./styles/tokens.css";
import "./styles/base.css";
import "./styles/animations.css";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <App />
  </StrictMode>
);
```

- [ ] **Step 5: Delete the migrated lines from `src/App.css`**

Delete lines 1-47 (the `/* ShareRoom — Design System v2 */` header, the `:root { ... }` block, `* { box-sizing... }`, `html, body, #root { ... }`, `button { font-family... }`).

Delete the ESTADOS + ANIMAÇÕES + SCROLLBAR block — the `/* ESTADOS */` comment header through the end of `::-webkit-scrollbar-thumb:hover { background: var(--border-strong); }` (originally lines 1143-1223 — everything between the end of the MODAL section's `.modal-body { max-height... }` rule and the start of the `/* RESPONSIVO */` comment).

Leave the `/* RESPONSIVO */` block and everything above ESTADOS untouched for now — later tasks handle those.

- [ ] **Step 6: Remove Google Fonts loading and update the title in `index.html`**

Remove these four lines entirely:
```html
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link
      href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap"
      rel="stylesheet"
    />
```

Change:
```html
    <title>ShareRoom — Compartilhamento de tela privado</title>
```
to:
```html
    <title>Kindling — Compartilhamento de tela privado</title>
```

- [ ] **Step 7: Verify**

Run `npm run dev`, open the app. The whole app (Home screen and, if you join a room, the room shell) should now render in the new warm cream "paper" palette instead of the old dark purple/blurple theme — this is the visible signal that `tokens.css` is now the only source of `:root`, since `App.css` no longer defines one. Confirm no console errors about missing CSS classes, and confirm the browser tab title reads "Kindling — Compartilhamento de tela privado". Confirm the page no longer requests fonts.googleapis.com in the Network tab.

- [ ] **Step 8: Commit**

```bash
git add src/styles/tokens.css src/styles/base.css src/styles/animations.css src/main.jsx src/App.css index.html
git commit -m "Add Kindling design tokens and base styles, remove webfont loading"
```

---

### Task 2: Theme toggle (light/dark), applied globally

**Files:**
- Create: `src/hooks/useTheme.js`
- Modify: `index.html` (add anti-FOUC inline script)
- Modify: `src/pages/Room.jsx` (call `useTheme()`, pass `theme`/`toggleTheme` to `ControlDock` and `SettingsModal`)
- Modify: `src/components/ControlDock.jsx` (accept `theme`/`toggleTheme` props, add toggle button)
- Modify: `src/components/SettingsModal.jsx` (accept `theme`/`toggleTheme` props, add an "Aparência" setting group)

**Interfaces:**
- Consumes: `[data-theme="dark"]` tokens from Task 1's `tokens.css`.
- Produces: `useTheme()` hook returning `{ theme: "light" | "dark", toggleTheme: () => void }`, used by `Room.jsx`, passed down to `ControlDock` and `SettingsModal`.

- [ ] **Step 1: Create `src/hooks/useTheme.js`**

```js
import { useState, useEffect, useCallback } from "react";

const STORAGE_KEY = "sr_theme";

function getSystemTheme() {
  return window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

function readStoredTheme() {
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return null; // storage bloqueado — segue pela preferência do sistema
  }
}

function writeStoredTheme(theme) {
  try {
    localStorage.setItem(STORAGE_KEY, theme);
  } catch {
    /* storage bloqueado — a escolha manual só vale para esta sessão */
  }
}

/**
 * Tema claro/escuro do app. A primeira aplicação (antes do React montar)
 * já acontece via script inline em index.html, para não piscar o tema
 * errado; este hook só assume o estado depois disso e cuida da alternância.
 */
export function useTheme() {
  const [theme, setTheme] = useState(() => readStoredTheme() || getSystemTheme());

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
  }, [theme]);

  const toggleTheme = useCallback(() => {
    setTheme((current) => {
      const next = current === "dark" ? "light" : "dark";
      writeStoredTheme(next);
      return next;
    });
  }, []);

  return { theme, toggleTheme };
}
```

- [ ] **Step 2: Add the anti-FOUC inline script to `index.html`**

Add this as the first child of `<head>`, before the `<meta charset...>` line is fine either order but it must come before any stylesheet and must not have `type="module"`/`defer`/`async`:

```html
    <script>
      (function () {
        try {
          var stored = localStorage.getItem("sr_theme");
          var theme = stored || (
            window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches
              ? "dark"
              : "light"
          );
          document.documentElement.setAttribute("data-theme", theme);
        } catch (e) {
          document.documentElement.setAttribute("data-theme", "light");
        }
      })();
    </script>
```

The `STORAGE_KEY` literal `"sr_theme"` here must stay in sync with `useTheme.js` — they're intentionally duplicated (one runs before any JS module loads, one runs inside React).

- [ ] **Step 3: Wire `useTheme()` into `RoomContent` in `src/pages/Room.jsx`**

Add the import:
```jsx
import { useTheme } from "../hooks/useTheme";
```

Inside `RoomContent`, alongside the other hooks (after `const quality = useStreamQuality();`):
```jsx
  const { theme, toggleTheme } = useTheme();
```

Update the `<ControlDock>` element to pass the two new props:
```jsx
      <ControlDock
        deafened={deafened}
        onToggleDeafen={toggleDeafen}
        onOpenSettings={() => setSettingsOpen(true)}
        onLeave={onLeave}
        quality={quality}
        theme={theme}
        onToggleTheme={toggleTheme}
      />
```

Update the `<SettingsModal>` element the same way:
```jsx
      <SettingsModal
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        quality={quality}
        isSharing={isLocalSharing}
        theme={theme}
        onToggleTheme={toggleTheme}
      />
```

- [ ] **Step 4: Add the toggle button to `src/components/ControlDock.jsx`**

Update the export signature:
```jsx
export function ControlDock({ deafened, onToggleDeafen, onOpenSettings, onLeave, quality, theme, onToggleTheme }) {
```

Add a new button right before the "Configurações" button (before the `{/* Configurações */}` comment):
```jsx
        {/* Tema */}
        <button
          className="dock-btn subtle"
          onClick={onToggleTheme}
          title={theme === "dark" ? "Mudar para tema claro" : "Mudar para tema escuro"}
        >
          {theme === "dark" ? "☀️" : "🌙"}
        </button>

```

- [ ] **Step 5: Add the appearance setting to `src/components/SettingsModal.jsx`**

Update the export signature:
```jsx
export function SettingsModal({ open, onClose, quality, isSharing, theme, onToggleTheme }) {
```

Add a new setting group as the first thing inside `.modal-body` (before the `{/* Microfone */}` comment), reusing the existing `mode-options`/`mode-option` pattern already styled for the degradation-mode picker:
```jsx
          {/* Aparência */}
          <div className="setting-group">
            <label>Aparência</label>
            <div className="mode-options">
              <button
                className={`mode-option ${theme === "light" ? "selected" : ""}`}
                onClick={() => theme !== "light" && onToggleTheme()}
              >
                <span className="mode-label">☀️ Claro</span>
                <span className="mode-hint">Fundo claro, tipo papel</span>
              </button>
              <button
                className={`mode-option ${theme === "dark" ? "selected" : ""}`}
                onClick={() => theme !== "dark" && onToggleTheme()}
              >
                <span className="mode-label">🌙 Escuro</span>
                <span className="mode-hint">Fundo escuro e quente</span>
              </button>
            </div>
          </div>

          <div className="setting-divider" />

```

- [ ] **Step 6: Verify**

Run `npm run dev`, join a room. Click the moon/sun icon in the control dock — the whole app should smoothly cross-fade (via the `transition` added to `html,body,#root` in Task 1) between the light "paper" palette and the warm dark palette. Open Settings, confirm the "Aparência" group shows the same two options and stays in sync with the dock button. Reload the page — confirm it comes back in the theme you last picked, with no visible flash of the other theme. Clear `localStorage` (or open a private window) and confirm it follows the OS-level light/dark setting instead.

- [ ] **Step 7: Commit**

```bash
git add src/hooks/useTheme.js index.html src/pages/Room.jsx src/components/ControlDock.jsx src/components/SettingsModal.jsx
git commit -m "Add light/dark theme toggle to Kindling"
```

---

### Task 3: Extract `src/pages/Home.css`

**Files:**
- Create: `src/pages/Home.css`
- Modify: `src/pages/Home.jsx` (add `import "./Home.css";`)
- Modify: `src/App.css` (delete the migrated lines)

**Interfaces:**
- Consumes: tokens from Task 1.

- [ ] **Step 1: Create `src/pages/Home.css`** with the HOME section content from `App.css` (originally lines 49-233, comment header through `.home-footer`), applying the standing substitution rules — `.primary-btn` gets `color: var(--accent-text);` instead of `color: white;`, and the `.invite-banner code` rule's `font-family: "Fira Code", monospace;` becomes `font-family: var(--font-mono);`. Also add this rule (new, for the Kindling wordmark, per the spec's typography section — the serif face is used for `<h1>` in the logo block):

```css
.home-logo h1 {
  font-family: var(--font-serif);
}
```

Append this to the RESPONSIVO block content already scoped to Home (from `App.css` line ~1246): `.home-card { padding: 28px 22px; }` inside a `@media (max-width: 560px) { }` block.

The full file:
```css
/* =========================================
   HOME
   ========================================= */

.home-container {
  min-height: 100dvh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  overflow-y: auto;
  background:
    radial-gradient(ellipse 70% 50% at 50% 0%, var(--accent-glow) 0%, transparent 70%),
    var(--bg-base);
}

.home-card {
  width: 100%;
  max-width: 460px;
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: 20px;
  padding: 38px 34px;
  display: flex;
  flex-direction: column;
  gap: 22px;
}

.home-logo { text-align: center; }

.logo-icon {
  font-size: 2.3rem;
  display: block;
  margin-bottom: 6px;
  color: var(--accent);
}

.home-logo h1 {
  font-family: var(--font-serif);
  font-size: 1.75rem;
  font-weight: 700;
  letter-spacing: -0.025em;
}

.home-subtitle {
  margin-top: 5px;
  font-size: 0.88rem;
  color: var(--text-secondary);
}

/* Banner de convite */
.invite-banner {
  display: flex;
  align-items: center;
  gap: 12px;
  background: rgba(76, 139, 91, 0.1);
  border: 1px solid rgba(76, 139, 91, 0.3);
  border-radius: var(--radius);
  padding: 13px 16px;
}

.invite-icon { font-size: 1.3rem; }

.invite-banner strong {
  display: block;
  font-size: 0.72rem;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--text-secondary);
  margin-bottom: 2px;
}

.invite-banner code {
  font-family: var(--font-mono);
  font-size: 0.95rem;
  color: var(--success);
  letter-spacing: 0.08em;
}

/* Aviso de segurança */
.security-notice {
  display: flex;
  gap: 11px;
  background: var(--accent-glow);
  border: 1px solid var(--border-accent);
  border-radius: var(--radius);
  padding: 13px 15px;
}

.notice-icon { font-size: 1.1rem; flex-shrink: 0; }

.security-notice strong {
  font-size: 0.83rem;
  display: block;
  margin-bottom: 3px;
}

.security-notice p {
  font-size: 0.78rem;
  color: var(--text-secondary);
  line-height: 1.55;
}

/* Form */
.form-group { display: flex; flex-direction: column; gap: 6px; }

.form-group label {
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.06em;
}

.form-group input,
.setting-group select {
  padding: 12px 14px;
  background: var(--bg-elevated);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  color: var(--text-primary);
  font-size: 0.94rem;
  font-family: var(--font);
  outline: none;
  transition: border-color 0.15s, box-shadow 0.15s;
}

.form-group input:focus,
.setting-group select:focus {
  border-color: var(--accent);
  box-shadow: 0 0 0 3px var(--accent-glow);
}

.form-group input::placeholder { color: var(--text-muted); }

/* Warning confirm */
.warning-confirm {
  display: flex;
  gap: 11px;
  background: rgba(184, 134, 46, 0.1);
  border: 1px solid rgba(184, 134, 46, 0.3);
  border-radius: var(--radius);
  padding: 13px 15px;
  animation: fadeIn 0.2s ease-out;
}

.warning-confirm strong {
  font-size: 0.83rem;
  color: var(--warning);
  display: block;
  margin-bottom: 3px;
}

.warning-confirm p {
  font-size: 0.78rem;
  color: var(--text-secondary);
  line-height: 1.55;
}

.primary-btn {
  padding: 13px;
  background: var(--accent);
  border: none;
  border-radius: var(--radius-sm);
  color: var(--accent-text);
  font-size: 0.93rem;
  font-weight: 600;
  cursor: pointer;
  transition: background-color 0.15s ease-out, transform 0.15s ease-out, box-shadow 0.15s ease-out;
}

.primary-btn:hover:not(:disabled) {
  background: var(--accent-dark);
  transform: translateY(-1px);
  box-shadow: 0 4px 18px var(--accent-glow);
}

.primary-btn:disabled { opacity: 0.35; cursor: not-allowed; }
.primary-btn.confirm-mode { background: var(--success); }
.primary-btn.confirm-mode:hover:not(:disabled) { background: #3D7249; }

.home-footer {
  font-size: 0.72rem;
  color: var(--text-muted);
  text-align: center;
}

@media (max-width: 560px) {
  .home-card { padding: 28px 22px; }
}
```

Note: `.form-group input, .setting-group select` and the `:focus` pairing rule are shared with `SettingsModal.css` (Task 8) — both files define the same selector pair harmlessly (CSS allows the same rule in two files; whichever loads second wins ties, and the declarations are identical so it doesn't matter). This mirrors how the original single `App.css` already coupled these two unrelated components in one rule.

- [ ] **Step 2: Add the import to `src/pages/Home.jsx`**

At the top of the file, after the existing `import { useState, useEffect } from "react";` line:
```jsx
import "./Home.css";
```

- [ ] **Step 3: Delete the migrated lines from `src/App.css`**

Delete the `/* HOME */` comment header through the end of `.home-footer { ... }` (originally lines 49-233). Also delete, from the RESPONSIVO block near the end of the file, the line `.home-card { padding: 28px 22px; }` (leave the surrounding `@media (max-width: 560px) { }` wrapper only if `.invite-btn` still needs it — see Task 4, which still has a rule in that same media block).

- [ ] **Step 4: Verify**

Run `npm run dev`, load the Home screen. Visually compare against the screenshot/behavior before this task — layout, spacing, and interactions must be identical, only the color values differ (already changed in Task 1) and the heading now uses the serif font. Confirm no missing-style flashes (unstyled `.home-card` etc.) and no console warnings about duplicate CSS.

- [ ] **Step 5: Commit**

```bash
git add src/pages/Home.css src/pages/Home.jsx src/App.css
git commit -m "Extract Home.css from App.css"
```

---

### Task 4: Extract `src/pages/Room.css`

**Files:**
- Create: `src/pages/Room.css`
- Modify: `src/pages/Room.jsx` (add `import "./Room.css";`)
- Modify: `src/App.css` (delete the migrated lines)

**Interfaces:**
- Consumes: tokens from Task 1.

- [ ] **Step 1: Create `src/pages/Room.css`** — combines the ROOM SHELL section (originally lines 235-311) and the link-fallback block (originally lines 565-600, physically misplaced after STAGE in the old file but rendered by `Room.jsx`), plus their two RESPONSIVO rules (`.topbar-warning { display: none; }` at 860px, `.link-fallback { flex-wrap: wrap; }` at 860px, and `.invite-btn { font-size...; padding...; }` at 560px):

```css
/* =========================================
   ROOM — SHELL
   ========================================= */

.room-shell {
  display: flex;
  flex-direction: column;
  height: 100dvh;
  background: var(--bg-base);
  overflow: hidden;
}

/* Topbar */
.room-topbar {
  display: flex;
  align-items: center;
  gap: 14px;
  height: 48px;
  padding: 0 16px;
  background: var(--bg-card);
  border-bottom: 1px solid var(--border);
  flex-shrink: 0;
}

.topbar-left { display: flex; align-items: center; gap: 12px; }

.topbar-logo { font-size: 1.1rem; color: var(--accent); }

.topbar-room { display: flex; align-items: center; gap: 7px; }

.topbar-label {
  font-size: 0.7rem;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--text-muted);
  font-weight: 600;
}

.topbar-room code {
  background: var(--bg-elevated);
  border: 1px solid var(--border);
  border-radius: 5px;
  padding: 2px 9px;
  font-family: var(--font-mono);
  font-size: 0.82rem;
  color: var(--accent);
  letter-spacing: 0.06em;
}

.invite-btn {
  padding: 6px 14px;
  background: var(--accent);
  border: none;
  border-radius: var(--radius-sm);
  color: var(--accent-text);
  font-size: 0.8rem;
  font-weight: 600;
  cursor: pointer;
  transition: background-color 0.15s ease-out;
}

.invite-btn:hover { background: var(--accent-dark); }
.invite-btn.copied { background: var(--success); }

.topbar-warning {
  margin-left: auto;
  font-size: 0.73rem;
  color: var(--text-muted);
}

/* Body */
.room-body {
  flex: 1;
  display: flex;
  min-height: 0;
  overflow: hidden;
}

/* --- Fallback de cópia do link --- */

.link-fallback {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 16px;
  background: rgba(184, 134, 46, 0.12);
  border-bottom: 1px solid rgba(184, 134, 46, 0.3);
  font-size: 0.78rem;
  color: var(--text-secondary);
  flex-shrink: 0;
}

.link-fallback input {
  flex: 1;
  padding: 6px 10px;
  background: var(--bg-base);
  border: 1px solid var(--border);
  border-radius: 6px;
  color: var(--text-primary);
  font-family: var(--font-mono);
  font-size: 0.76rem;
  outline: none;
}

.link-fallback button {
  padding: 6px 14px;
  background: var(--bg-elevated);
  border: 1px solid var(--border);
  border-radius: 6px;
  color: var(--text-secondary);
  font-size: 0.76rem;
  font-weight: 600;
  cursor: pointer;
}

@media (max-width: 860px) {
  .topbar-warning { display: none; }
  .link-fallback { flex-wrap: wrap; }
}

@media (max-width: 560px) {
  .invite-btn { font-size: 0.75rem; padding: 6px 10px; }
}
```

- [ ] **Step 2: Add the import to `src/pages/Room.jsx`**

After the existing `import "@livekit/components-styles";` line:
```jsx
import "./Room.css";
```

- [ ] **Step 3: Delete the migrated lines from `src/App.css`**

Delete the `/* ROOM — SHELL */` comment header through the end of `.room-body { ... }` (originally lines 235-311). Delete the `/* --- Fallback de cópia do link --- */` comment through the end of `.link-fallback button { ... }` (originally lines 565-600). From the RESPONSIVO block, delete `.topbar-warning { display: none; }` and `.link-fallback { flex-wrap: wrap; }` from the 860px media query, and delete `.invite-btn { font-size: 0.75rem; padding: 6px 10px; }` from the 560px media query (this empties that media block entirely — delete the now-empty `@media (max-width: 560px) { }` wrapper too).

- [ ] **Step 4: Verify**

Run `npm run dev`, join a room. Confirm the topbar (room code, invite button, warning text) and the "copy link failed" fallback bar (trigger it by testing in a context where clipboard write fails, e.g. after opening the screen-share picker) render identically to before, just in the new palette.

- [ ] **Step 5: Commit**

```bash
git add src/pages/Room.css src/pages/Room.jsx src/App.css
git commit -m "Extract Room.css from App.css"
```

---

### Task 5: Extract `src/components/Stage.css`

**Files:**
- Create: `src/components/Stage.css`
- Modify: `src/components/Stage.jsx` (add `import "./Stage.css";`)
- Modify: `src/App.css` (delete the migrated lines)

**Interfaces:**
- Consumes: tokens from Task 1, `speakingPulse` keyframe from Task 1's `animations.css`.

- [ ] **Step 1: Create `src/components/Stage.css`** with the STAGE section content (originally lines 313-563, comment header through `.tile-action:hover`), plus its RESPONSIVO rules from the 860px block (`.screen-grid.count-2/3/4`, `.people-grid.count-3/4/5/6`, `.person-card`). Apply the substitution rules: `.person-avatar` gets `color: var(--accent-text);` instead of `color: white;`; `.person-card.speaking .person-avatar` gains the new pulse animation:

```css
/* =========================================
   STAGE
   ========================================= */

.stage {
  flex: 1;
  min-width: 0;
  background: var(--bg-stage);
  padding: 10px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  overflow: hidden;
}

.stage:fullscreen { padding: 0; gap: 0; background: #000; }

/* --- Visão de pessoas (ninguém transmitindo) --- */

.people-view {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 22px;
  min-height: 0;
  padding: 16px;
}

.people-grid {
  display: grid;
  gap: 12px;
  place-content: center;
}

.people-grid.count-1 { grid-template-columns: 1fr; }
.people-grid.count-2 { grid-template-columns: repeat(2, 1fr); }
.people-grid.count-3 { grid-template-columns: repeat(3, 1fr); }
.people-grid.count-4 { grid-template-columns: repeat(2, 1fr); }
.people-grid.count-5,
.people-grid.count-6 { grid-template-columns: repeat(3, 1fr); }

.person-card {
  position: relative;
  width: 168px;
  height: 118px;
  background: var(--bg-elevated);
  border: 2px solid transparent;
  border-radius: var(--radius);
  display: flex;
  align-items: center;
  justify-content: center;
  transition: border-color 0.15s ease-out, box-shadow 0.15s ease-out;
}

.person-card.big { width: 220px; height: 154px; }

.person-card.speaking {
  border-color: var(--speaking);
  box-shadow: 0 0 0 3px var(--accent-glow);
}

.person-card.speaking .person-avatar {
  animation: speakingPulse 1.6s ease-in-out infinite;
}

.person-avatar {
  width: 56px;
  height: 56px;
  border-radius: 50%;
  background: var(--accent);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.4rem;
  font-weight: 700;
  color: var(--accent-text);
}

.person-card.big .person-avatar { width: 68px; height: 68px; font-size: 1.7rem; }

.person-footer {
  position: absolute;
  bottom: 7px;
  left: 8px;
  right: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
}

.person-name {
  font-size: 0.79rem;
  font-weight: 600;
  color: var(--text-secondary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.person-mic { font-size: 0.72rem; opacity: 0.75; }

.stage-callout {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  max-width: 440px;
  background: var(--accent-glow);
  border: 1px solid var(--border-accent);
  border-radius: var(--radius);
  padding: 13px 16px;
}

.stage-callout span { font-size: 1.3rem; }

.stage-callout strong {
  display: block;
  font-size: 0.85rem;
  margin-bottom: 3px;
}

.stage-callout p {
  font-size: 0.78rem;
  color: var(--text-secondary);
  line-height: 1.55;
}

/* --- Grade de telas --- */

.screen-grid {
  flex: 1;
  display: grid;
  gap: 8px;
  min-height: 0;
  min-width: 0;
}

.screen-grid.count-1 { grid-template-columns: 1fr; }
.screen-grid.count-2 { grid-template-columns: 1fr 1fr; }
.screen-grid.count-3,
.screen-grid.count-4 { grid-template-columns: 1fr 1fr; grid-template-rows: 1fr 1fr; }

.stage-tip {
  text-align: center;
  font-size: 0.72rem;
  color: var(--text-muted);
  flex-shrink: 0;
}

/* --- Modo foco --- */

.focus-main {
  flex: 1;
  min-height: 0;
  display: flex;
}

.focus-main .screen-tile { flex: 1; }

.filmstrip {
  height: 104px;
  flex-shrink: 0;
  display: flex;
  gap: 8px;
  overflow-x: auto;
  padding-bottom: 2px;
}

.stage:fullscreen .filmstrip { display: none; }

/* --- Tile de tela --- */

.screen-tile {
  position: relative;
  background: #000;
  border: 2px solid var(--border);
  border-radius: var(--radius);
  overflow: hidden;
  min-height: 0;
  min-width: 0;
  cursor: pointer;
  transition: border-color 0.15s ease-out;
}

.screen-tile:hover { border-color: var(--border-strong); }
.screen-tile.focused { border-color: var(--accent); }
.screen-tile.speaking { border-color: var(--speaking); }

.screen-tile.compact {
  width: 170px;
  height: 100%;
  flex-shrink: 0;
  border-radius: var(--radius-sm);
}

.stage:fullscreen .screen-tile {
  border: none;
  border-radius: 0;
}

.screen-video,
.screen-tile video {
  width: 100%;
  height: 100%;
  object-fit: contain;
  display: block;
}

.tile-bar {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 16px 11px 8px;
  background: linear-gradient(to top, rgba(0,0,0,0.8), transparent);
  opacity: 0;
  transition: opacity 0.15s ease-out;
}

.screen-tile:hover .tile-bar,
.screen-tile.compact .tile-bar { opacity: 1; }

.tile-name {
  font-size: 0.78rem;
  font-weight: 600;
  color: white;
  text-shadow: 0 1px 3px rgba(0,0,0,0.9);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.screen-tile.compact .tile-name { font-size: 0.68rem; }

.tile-action {
  width: 26px;
  height: 26px;
  flex-shrink: 0;
  background: rgba(255,255,255,0.16);
  backdrop-filter: blur(8px);
  border: 1px solid rgba(255,255,255,0.2);
  border-radius: 6px;
  color: white;
  font-size: 0.85rem;
  cursor: pointer;
  transition: background-color 0.15s ease-out;
}

.tile-action:hover { background: rgba(255,255,255,0.32); }

@media (max-width: 860px) {
  .screen-grid.count-2,
  .screen-grid.count-3,
  .screen-grid.count-4 { grid-template-columns: 1fr; grid-template-rows: none; }
  .people-grid.count-3,
  .people-grid.count-4,
  .people-grid.count-5,
  .people-grid.count-6 { grid-template-columns: repeat(2, 1fr); }
  .person-card { width: 132px; height: 96px; }
}
```

- [ ] **Step 2: Add the import to `src/components/Stage.jsx`**

After the existing `import { Track } from "livekit-client";` line:
```jsx
import "./Stage.css";
```

- [ ] **Step 3: Delete the migrated lines from `src/App.css`**

Delete the `/* STAGE */` comment header through `.tile-action:hover { ... }` (originally lines 313-563). From the RESPONSIVO block, delete the `.screen-grid.count-2/3/4`, `.people-grid.count-3/4/5/6`, and `.person-card` rules from the 860px media query.

- [ ] **Step 4: Verify**

Run `npm run dev`, join a room from two browser profiles, share a screen from one. Confirm: the "nobody sharing" person-card view, the single-focus + filmstrip view, and the multi-screen grid view all render correctly; hovering a tile still reveals the name/fullscreen-button bar; the speaking participant's avatar now visibly pulses (gently) when they talk, instead of only showing a static border.

- [ ] **Step 5: Commit**

```bash
git add src/components/Stage.css src/components/Stage.jsx src/App.css
git commit -m "Extract Stage.css from App.css, add speaking-pulse animation"
```

---

### Task 6: Extract `src/components/ParticipantList.css`

**Files:**
- Create: `src/components/ParticipantList.css`
- Modify: `src/components/ParticipantList.jsx` (add `import "./ParticipantList.css";`)
- Modify: `src/App.css` (delete the migrated lines)

**Interfaces:**
- Consumes: tokens from Task 1, `fadeIn`/`speakingPulse` keyframes from Task 1's `animations.css`.

- [ ] **Step 1: Create `src/components/ParticipantList.css`** with the SIDEBAR DE PARTICIPANTES section content (originally lines 602-841), plus its RESPONSIVO rule (`.participant-sidebar { display: none; }` at 860px). Apply substitutions: `.avatar` gets `color: var(--accent-text);`; `.avatar.pulse` gains the pulse animation; `.volume-value` and any monospace usage switch to `var(--font-mono)`:

```css
/* =========================================
   SIDEBAR DE PARTICIPANTES
   ========================================= */

.participant-sidebar {
  width: var(--sidebar-w);
  flex-shrink: 0;
  background: var(--bg-card);
  border-left: 1px solid var(--border);
  display: flex;
  flex-direction: column;
}

.sidebar-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  border-bottom: 1px solid var(--border);
}

.sidebar-title {
  font-size: 0.72rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--text-muted);
}

.participant-count {
  background: var(--bg-elevated);
  border-radius: 999px;
  padding: 1px 9px;
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--text-secondary);
}

.participant-scroll {
  flex: 1;
  overflow-y: auto;
  padding: 6px;
}

.participant-row {
  border-radius: var(--radius-sm);
  margin-bottom: 2px;
  transition: background-color 0.12s ease-out;
}

.participant-row:hover { background: var(--bg-hover); }

.participant-main {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 10px;
  cursor: pointer;
}

.avatar {
  width: 32px;
  height: 32px;
  flex-shrink: 0;
  border-radius: 50%;
  background: var(--accent);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.85rem;
  font-weight: 700;
  color: var(--accent-text);
  border: 2px solid transparent;
  transition: border-color 0.15s ease-out;
}

.avatar.pulse {
  border-color: var(--speaking);
  box-shadow: 0 0 0 3px var(--accent-glow);
  animation: speakingPulse 1.6s ease-in-out infinite;
}

.participant-info { flex: 1; min-width: 0; }

.participant-name {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 0.86rem;
  font-weight: 500;
  color: var(--text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.you-badge {
  font-size: 0.65rem;
  background: var(--bg-elevated);
  border-radius: 4px;
  padding: 1px 5px;
  color: var(--text-muted);
  font-weight: 600;
  text-transform: uppercase;
}

.participant-status { display: flex; gap: 5px; margin-top: 2px; }

.status-chip {
  font-size: 0.66rem;
  padding: 1px 6px;
  border-radius: 4px;
  font-weight: 500;
}

.status-chip.sharing { background: rgba(76,139,91,0.16); color: var(--success); }
.status-chip.silenced { background: rgba(178,68,68,0.16); color: var(--danger); }
.status-chip.known {
  background: var(--accent-glow);
  color: var(--accent);
  cursor: help;
}

.mic-icon { font-size: 0.85rem; }
.mic-icon.muted { opacity: 0.45; }

/* Badge de apelido local */
.nick-badge {
  font-size: 0.62rem;
  background: var(--accent-glow);
  color: var(--accent);
  border-radius: 4px;
  padding: 1px 5px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.03em;
  cursor: help;
}

/* Input de renomear inline */
.nickname-input {
  width: 100%;
  padding: 3px 7px;
  background: var(--bg-base);
  border: 1px solid var(--accent);
  border-radius: 5px;
  color: var(--text-primary);
  font-size: 0.84rem;
  font-family: var(--font);
  outline: none;
}

.nickname-input::placeholder { color: var(--text-muted); }

/* Bloco de controles expandido */
.row-controls {
  padding: 2px 12px 10px;
  display: flex;
  flex-direction: column;
  gap: 7px;
  animation: fadeIn 0.15s ease-out;
}

.rename-btn {
  padding: 5px 10px;
  background: var(--bg-elevated);
  border: 1px solid var(--border);
  border-radius: 6px;
  color: var(--text-secondary);
  font-size: 0.73rem;
  font-weight: 600;
  cursor: pointer;
  transition: background-color 0.14s ease-out, color 0.14s ease-out, border-color 0.14s ease-out;
  text-align: left;
}

.rename-btn:hover {
  background: var(--bg-hover);
  color: var(--text-primary);
  border-color: var(--border-strong);
}

/* Volume control */
.volume-control {
  display: flex;
  align-items: center;
  gap: 8px;
  animation: fadeIn 0.15s ease-out;
}

.volume-label {
  font-size: 0.7rem;
  color: var(--text-muted);
  font-weight: 600;
}

.volume-control input[type="range"] {
  flex: 1;
  height: 4px;
  -webkit-appearance: none;
  background: var(--bg-elevated);
  border-radius: 2px;
  outline: none;
}

.volume-control input[type="range"]::-webkit-slider-thumb {
  -webkit-appearance: none;
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: var(--accent);
  cursor: pointer;
}

.volume-control input[type="range"]::-moz-range-thumb {
  width: 12px;
  height: 12px;
  border: none;
  border-radius: 50%;
  background: var(--accent);
  cursor: pointer;
}

.volume-value {
  font-size: 0.7rem;
  color: var(--text-secondary);
  min-width: 34px;
  text-align: right;
  font-family: var(--font-mono);
}

.sidebar-footer {
  padding: 10px 16px;
  border-top: 1px solid var(--border);
}

.sidebar-hint {
  font-size: 0.7rem;
  color: var(--text-muted);
  line-height: 1.5;
}

@media (max-width: 860px) {
  .participant-sidebar { display: none; }
}
```

- [ ] **Step 2: Add the import to `src/components/ParticipantList.jsx`**

After the existing `import { ErrorBoundary } from "./ErrorBoundary";` line:
```jsx
import "./ParticipantList.css";
```

- [ ] **Step 3: Delete the migrated lines from `src/App.css`**

Delete the `/* SIDEBAR DE PARTICIPANTES */` comment header through `.sidebar-hint { ... }` (originally lines 602-841). From the RESPONSIVO block, delete `.participant-sidebar { display: none; }` from the 860px media query.

- [ ] **Step 4: Verify**

Run `npm run dev`, join a room with two profiles. Confirm the participant sidebar renders identically: hover highlight, avatar, speaking pulse on the avatar (not just the static border), status chips, expand-to-show volume slider and rename button, inline rename input.

- [ ] **Step 5: Commit**

```bash
git add src/components/ParticipantList.css src/components/ParticipantList.jsx src/App.css
git commit -m "Extract ParticipantList.css from App.css, add speaking-pulse animation"
```

---

### Task 7: Extract `src/components/ControlDock.css`

**Files:**
- Create: `src/components/ControlDock.css`
- Modify: `src/components/ControlDock.jsx` (add `import "./ControlDock.css";`)
- Modify: `src/App.css` (delete the migrated lines)

**Interfaces:**
- Consumes: tokens from Task 1.

- [ ] **Step 1: Create `src/components/ControlDock.css`** — combines the CONTROL DOCK section (originally lines 843-945) with `.usage-pip`/`.stream-quality-tag` (originally lines 1037-1064, physically misplaced inside the old MODAL section but only ever rendered by `ControlDock.jsx`), plus the dock's RESPONSIVO rules (`.dock-btn span { display: none; } .dock-btn { padding: 10px 13px; }` at 860px). Substitution: `.dock-btn.screen.sharing` gets `color: var(--accent-text);`:

```css
/* =========================================
   CONTROL DOCK
   ========================================= */

.control-dock {
  height: var(--dock-h);
  flex-shrink: 0;
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 0 16px;
  background: var(--bg-card);
  border-top: 1px solid var(--border);
}

/* Quality pip */
.quality-pip {
  display: flex;
  align-items: center;
  gap: 7px;
  padding: 5px 11px;
  background: var(--bg-elevated);
  border: 1px solid var(--border);
  border-radius: 999px;
  flex-shrink: 0;
}

.q-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: var(--text-muted);
}

.q-good .q-dot { background: var(--success); box-shadow: 0 0 6px var(--success); }
.q-ok .q-dot { background: var(--warning); }
.q-bad .q-dot { background: var(--danger); }

.q-text {
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--text-secondary);
  font-family: var(--font-mono);
}

.usage-pip {
  padding: 5px 11px;
  background: var(--bg-elevated);
  border: 1px solid var(--border);
  border-radius: 999px;
  font-size: 0.72rem;
  font-weight: 600;
  color: var(--text-muted);
  font-family: var(--font-mono);
  white-space: nowrap;
  cursor: help;
  flex-shrink: 0;
}

/* Tag de qualidade na dock */
.stream-quality-tag {
  padding: 5px 11px;
  background: var(--bg-elevated);
  border: 1px solid var(--border);
  border-radius: 999px;
  font-size: 0.72rem;
  font-weight: 600;
  color: var(--text-muted);
  font-family: var(--font-mono);
  white-space: nowrap;
  cursor: help;
  flex-shrink: 0;
}

.dock-buttons {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 0 auto;
}

.dock-btn {
  display: flex;
  align-items: center;
  gap: 7px;
  padding: 9px 15px;
  background: var(--bg-elevated);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  color: var(--text-secondary);
  font-size: 0.82rem;
  font-weight: 600;
  cursor: pointer;
  transition: background-color 0.14s ease-out, color 0.14s ease-out, transform 0.14s ease-out;
  white-space: nowrap;
}

.dock-btn:hover:not(:disabled) {
  background: var(--bg-hover);
  color: var(--text-primary);
  transform: translateY(-1px);
}

.dock-btn:disabled { opacity: 0.5; cursor: wait; }

.dock-btn.active {
  background: rgba(76,139,91,0.14);
  border-color: rgba(76,139,91,0.35);
  color: var(--success);
}

.dock-btn.off {
  background: rgba(178,68,68,0.14);
  border-color: rgba(178,68,68,0.35);
  color: var(--danger);
}

.dock-btn.screen.sharing {
  background: var(--accent);
  border-color: var(--accent);
  color: var(--accent-text);
}

.dock-btn.subtle { padding: 9px 12px; }

.dock-btn.danger {
  background: rgba(178,68,68,0.14);
  border-color: rgba(178,68,68,0.3);
  color: var(--danger);
}

.dock-btn.danger:hover { background: rgba(178,68,68,0.24); color: var(--danger); }

@media (max-width: 860px) {
  .dock-btn span { display: none; }
  .dock-btn { padding: 10px 13px; }
}
```

- [ ] **Step 2: Add the import to `src/components/ControlDock.jsx`**

After the existing `import { ConnectionQuality } from "livekit-client";` line:
```jsx
import "./ControlDock.css";
```

- [ ] **Step 3: Delete the migrated lines from `src/App.css`**

Delete the `/* CONTROL DOCK */` comment header through `.dock-btn.danger:hover { ... }` (originally lines 843-945). Delete `.usage-pip { ... }` and the `/* Tag de qualidade na dock */` comment plus `.stream-quality-tag { ... }` (originally lines 1037-1064, inside what's left of the MODAL section). From the RESPONSIVO block, delete `.dock-btn span { display: none; }` and `.dock-btn { padding: 10px 13px; }` from the 860px media query.

- [ ] **Step 4: Verify**

Run `npm run dev`, join a room. Confirm the control dock — quality pip, usage pip (share a screen and wait for data to flow so it appears), quality tag, mic/deafen/screen/settings/leave buttons and their active/off/sharing/danger states — all render and behave identically.

- [ ] **Step 5: Commit**

```bash
git add src/components/ControlDock.css src/components/ControlDock.jsx src/App.css
git commit -m "Extract ControlDock.css from App.css"
```

---

### Task 8: Extract `src/components/SettingsModal.css`

**Files:**
- Create: `src/components/SettingsModal.css`
- Modify: `src/components/SettingsModal.jsx` (add `import "./SettingsModal.css";`)
- Modify: `src/App.css` (delete the migrated lines — this empties `App.css` down to just the RESPONSIVO wrapper)

**Interfaces:**
- Consumes: tokens from Task 1, `fadeIn`/`slideUp` keyframes from Task 1's `animations.css`.

- [ ] **Step 1: Create `src/components/SettingsModal.css`** with everything remaining in the old MODAL section after Tasks 6–7 removed the pips (originally lines 947-1141 minus 1037-1064, i.e. `.modal-backdrop` through `.setting-warning`, plus the `.perf-tips` rules and the trailing `.modal-body { max-height... }` override):

```css
/* =========================================
   MODAL
   ========================================= */

.modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.5);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
  padding: 24px;
  animation: fadeIn 0.15s ease-out;
}

.modal {
  width: 100%;
  max-width: 420px;
  background: var(--bg-card);
  border: 1px solid var(--border-strong);
  border-radius: 16px;
  overflow: hidden;
  animation: slideUp 0.2s ease-out;
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 18px 22px;
  border-bottom: 1px solid var(--border);
}

.modal-header h2 { font-size: 1.05rem; font-weight: 600; }

.modal-close {
  width: 28px;
  height: 28px;
  background: transparent;
  border: none;
  color: var(--text-muted);
  font-size: 1rem;
  cursor: pointer;
  border-radius: 6px;
  transition: background-color 0.14s ease-out, color 0.14s ease-out;
}

.modal-close:hover { background: var(--bg-hover); color: var(--text-primary); }

.modal-body {
  padding: 22px;
  display: flex;
  flex-direction: column;
  gap: 18px;
  max-height: 70vh;
  overflow-y: auto;
}

.setting-group { display: flex; flex-direction: column; gap: 7px; }

.setting-group label {
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--text-secondary);
}

.setting-hint { font-size: 0.74rem; color: var(--text-muted); line-height: 1.5; }

.setting-divider { height: 1px; background: var(--border); }

.perf-tips {
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.perf-tips li {
  font-size: 0.78rem;
  color: var(--text-secondary);
  padding-left: 16px;
  position: relative;
  line-height: 1.5;
}

.perf-tips li::before {
  content: "▸";
  position: absolute;
  left: 0;
  color: var(--accent);
}

/* Seletor de qualidade */
.quality-options,
.mode-options {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.quality-option,
.mode-option {
  display: flex;
  flex-direction: column;
  gap: 3px;
  padding: 10px 13px;
  background: var(--bg-elevated);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  cursor: pointer;
  text-align: left;
  transition: background-color 0.14s ease-out, border-color 0.14s ease-out;
}

.quality-option:hover,
.mode-option:hover {
  background: var(--bg-hover);
  border-color: var(--border-strong);
}

.quality-option.selected,
.mode-option.selected {
  background: var(--accent-glow);
  border-color: var(--accent);
}

.quality-option-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 8px;
}

.quality-label,
.mode-label {
  font-size: 0.86rem;
  font-weight: 600;
  color: var(--text-primary);
}

.quality-detail {
  font-size: 0.7rem;
  color: var(--text-muted);
  font-family: var(--font-mono);
}

.quality-hint,
.mode-hint {
  font-size: 0.73rem;
  color: var(--text-secondary);
  line-height: 1.45;
}

.setting-warning {
  background: rgba(184, 134, 46, 0.1);
  border: 1px solid rgba(184, 134, 46, 0.3);
  border-radius: var(--radius-sm);
  padding: 10px 13px;
  font-size: 0.75rem;
  color: var(--text-secondary);
  line-height: 1.5;
}
```

Note: `.setting-group select` styling is defined in `Home.css` (Task 3) as part of the shared `.form-group input, .setting-group select` rule — that's intentional and already noted there.

- [ ] **Step 2: Add the import to `src/components/SettingsModal.jsx`**

After the existing `import { QUALITY_PRESETS, DEGRADATION_MODES } from "../hooks/useStreamQuality";` line:
```jsx
import "./SettingsModal.css";
```

- [ ] **Step 3: Delete the remaining lines from `src/App.css`**

Delete everything from `/* MODAL */` through the end of the file's real content — at this point that's `.modal-backdrop` through the trailing `.modal-body { max-height: 70vh; overflow-y: auto; }` override, plus the now-empty `/* RESPONSIVO */` comment header and its `@media` wrapper (all component-specific rules inside it were already relocated by Tasks 3-7; confirm no rules remain before deleting the wrapper — if any do, that means an earlier task missed one, stop and go back to the matching task instead of discarding it).

After this step, `src/App.css` should be empty (0 bytes of actual rules) or contain only the two now-pointless comment-header lines. Move to Task 9 to remove the file entirely.

- [ ] **Step 4: Verify**

Run `npm run dev`, join a room, open Settings. Confirm the modal backdrop blur, entry animation, header/close button, all four setting groups (appearance from Task 2, mic, speaker, quality, degradation mode, perf tips), and the "you're sharing right now" warning all render and behave identically to before.

- [ ] **Step 5: Commit**

```bash
git add src/components/SettingsModal.css src/components/SettingsModal.jsx src/App.css
git commit -m "Extract SettingsModal.css from App.css"
```

---

### Task 9: Delete `App.css`

**Files:**
- Delete: `src/App.css`
- Modify: `src/App.jsx` (remove `import "./App.css";`)

**Interfaces:**
- None — this task only removes now-dead code.

- [ ] **Step 1: Confirm `src/App.css` has no remaining rules**

Open the file and confirm it contains nothing but (at most) leftover comment separators and blank lines — no actual selectors or declarations. If any rule remains, it means Tasks 3-8 missed it: go back, find which component actually renders that class, and move it into that component's `.css` file before continuing.

- [ ] **Step 2: Delete the file**

```bash
git rm src/App.css
```

- [ ] **Step 3: Remove its import from `src/App.jsx`**

Delete this line:
```jsx
import "./App.css";
```

- [ ] **Step 4: Verify**

Run `npm run dev`. The app must look and behave exactly as it did at the end of Task 8 — this task removes dead weight, it changes nothing visible. Confirm no console errors about a missing `App.css` import.

- [ ] **Step 5: Commit**

```bash
git add src/App.jsx
git commit -m "Remove empty App.css after full component-CSS migration"
```

---

### Task 10: Rename ShareRoom to Kindling

**Files:**
- Modify: `package.json`
- Modify: `package-lock.json`
- Modify: `src/pages/Home.jsx`
- Modify: `src/components/ErrorBoundary.jsx`
- Modify: `src/hooks/useStreamQuality.js`

**Interfaces:**
- None — string-literal changes only, no behavior change. Internal identifiers (`sr_*` localStorage keys, room slugs, deviceId) are explicitly NOT touched — see Global Constraints.

- [ ] **Step 1: Update `package.json`**

Change:
```json
  "name": "shareroom",
```
to:
```json
  "name": "kindling",
```

- [ ] **Step 2: Update `package-lock.json`**

Change both occurrences of `"name": "shareroom",` (line 2, the top-level package, and the matching entry under `"packages"`) to `"name": "kindling",`. Do not change anything else in this file — it's a lockfile, and editing dependency entries by hand would desync it from `package.json`.

- [ ] **Step 3: Update the wordmark in `src/pages/Home.jsx`**

Change:
```jsx
          <h1>ShareRoom</h1>
```
to:
```jsx
          <h1>Kindling</h1>
```

- [ ] **Step 4: Update the crash-log string in `src/components/ErrorBoundary.jsx`**

Change:
```jsx
    console.error("ShareRoom crash capturado:", error, info);
```
to:
```jsx
    console.error("Kindling crash capturado:", error, info);
```

- [ ] **Step 5: Update the comment in `src/hooks/useStreamQuality.js`**

Change:
```js
      // Evita o efeito espelho de compartilhar a própria aba do ShareRoom
```
to:
```js
      // Evita o efeito espelho de compartilhar a própria aba do Kindling
```

- [ ] **Step 6: Verify**

Run `npm run dev`, load the Home screen — confirm the wordmark reads "Kindling". Confirm `npm run build` still succeeds (the `package.json` rename doesn't affect the Vite build, but this confirms nothing else references the old package name). Grep the repo for any remaining `ShareRoom`/`shareroom` occurrence outside `node_modules`/`.git` and confirm only intentionally-preserved internal identifiers (`sr_*` keys) remain.

- [ ] **Step 7: Commit**

```bash
git add package.json package-lock.json src/pages/Home.jsx src/components/ErrorBoundary.jsx src/hooks/useStreamQuality.js
git commit -m "Rename ShareRoom to Kindling"
```

---

### Task 11: Code-split Home, Room, and SettingsModal

**Files:**
- Modify: `src/App.jsx` (lazy-load `Home` and `Room`)
- Modify: `src/pages/Room.jsx` (lazy-load `SettingsModal`)
- Modify: `src/styles/base.css` (add the `.route-loading` fallback style)

**Interfaces:**
- Produces: a `.route-loading` CSS class in `base.css`, consumed by the two new `Suspense` fallbacks below.

- [ ] **Step 1: Add the Suspense fallback style to `src/styles/base.css`**

Append to the end of the file:
```css

/* Fronteira de Suspense (rota carregando) */
.route-loading {
  min-height: 100dvh;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-muted);
  font-size: 0.85rem;
  animation: fadeIn 0.2s ease-out;
}
```

- [ ] **Step 2: Lazy-load `Home` and `Room` in `src/App.jsx`**

Replace:
```jsx
import { useState, useEffect } from "react";
import { Home } from "./pages/Home";
import { Room } from "./pages/Room";
import { ErrorBoundary } from "./components/ErrorBoundary";
```
with:
```jsx
import { useState, useEffect, Suspense, lazy } from "react";
import { ErrorBoundary } from "./components/ErrorBoundary";

const Home = lazy(() => import("./pages/Home").then((m) => ({ default: m.Home })));
const Room = lazy(() => import("./pages/Room").then((m) => ({ default: m.Room })));
```

Replace the return statement:
```jsx
  return (
    <ErrorBoundary onReset={handleLeave}>
      {session ? (
        <Room
          roomId={session.roomId}
          participantName={session.participantName}
          onLeave={handleLeave}
        />
      ) : (
        <Home onJoin={handleJoin} invitedRoom={invitedRoom} />
      )}
    </ErrorBoundary>
  );
```
with:
```jsx
  return (
    <ErrorBoundary onReset={handleLeave}>
      <Suspense fallback={<div className="route-loading">Carregando…</div>}>
        {session ? (
          <Room
            roomId={session.roomId}
            participantName={session.participantName}
            onLeave={handleLeave}
          />
        ) : (
          <Home onJoin={handleJoin} invitedRoom={invitedRoom} />
        )}
      </Suspense>
    </ErrorBoundary>
  );
```

- [ ] **Step 3: Lazy-load `SettingsModal` in `src/pages/Room.jsx`**

Replace:
```jsx
import { Stage } from "../components/Stage";
import { ControlDock } from "../components/ControlDock";
import { ParticipantList } from "../components/ParticipantList";
import { SettingsModal } from "../components/SettingsModal";
import { ErrorBoundary } from "../components/ErrorBoundary";
```
with:
```jsx
import { Suspense, lazy } from "react";
import { Stage } from "../components/Stage";
import { ControlDock } from "../components/ControlDock";
import { ParticipantList } from "../components/ParticipantList";
import { ErrorBoundary } from "../components/ErrorBoundary";

const SettingsModal = lazy(() =>
  import("../components/SettingsModal").then((m) => ({ default: m.SettingsModal }))
);
```

(Note: `useEffect, useState, useCallback, useMemo` is already imported from `"react"` at the top of this file — add `Suspense, lazy` as a second import from `"react"` rather than merging into that line, to keep this diff isolated to what this task touches.)

Wrap the `<SettingsModal>` usage in `Suspense` — since `SettingsModal` returns `null` when `open` is `false`, only show the fallback while `settingsOpen` is true:
```jsx
      {settingsOpen && (
        <Suspense fallback={<div className="route-loading">Carregando…</div>}>
          <SettingsModal
            open={settingsOpen}
            onClose={() => setSettingsOpen(false)}
            quality={quality}
            isSharing={isLocalSharing}
            theme={theme}
            onToggleTheme={toggleTheme}
          />
        </Suspense>
      )}
```

- [ ] **Step 4: Verify**

Run `npm run build && npm run preview` (dynamic imports only split into separate network requests in a production build, not always visibly in dev). Open the built app in the browser with DevTools Network tab open:
- Loading the Home screen (`/`) must NOT fetch the `livekit` vendor chunk (confirms `Room`, and therefore the LiveKit SDK, isn't downloaded until needed).
- Creating/joining a room must trigger a new chunk request for `Room` (and `livekit`).
- Opening Settings for the first time must trigger a separate chunk request for `SettingsModal`; closing and reopening it must NOT re-fetch it (cached after first load).
Then functionally re-verify: create a room, join from a second profile, share a screen, adjust volume, toggle theme, open/close Settings — everything must work exactly as before, just with the new network behavior.

- [ ] **Step 5: Commit**

```bash
git add src/App.jsx src/pages/Room.jsx src/styles/base.css
git commit -m "Code-split Home, Room, and SettingsModal with React.lazy"
```

---

## Self-review notes

- **Spec coverage:** naming (Task 10), light/dark tokens + FOUC prevention (Tasks 1-2), animation philosophy incl. `prefers-reduced-motion` (Task 1's `animations.css`), CSS fragmentation into co-located files (Tasks 1, 3-9), JS code-splitting behind `ErrorBoundary`/`Suspense` (Task 11), no new dependencies (verified throughout — no package.json dependency changes anywhere in this plan) — all spec sections have a corresponding task.
- **Placeholder scan:** every step contains literal file content or an exact line-range + substitution rule tied to content already read from the real files; no "TBD"/"add appropriate styles" left in.
- **Type/name consistency:** `useTheme()` returns `{ theme, toggleTheme }` in Task 2 Step 1 and every later consumer (`Room.jsx`, `ControlDock.jsx`, `SettingsModal.jsx`) uses exactly those two names; the `STORAGE_KEY`/`"sr_theme"` string is identical in both the inline `index.html` script and `useTheme.js`, called out explicitly since it can't be shared as an import between plain HTML and a JS module.
