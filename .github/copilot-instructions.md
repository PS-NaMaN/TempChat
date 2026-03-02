<!-- Purpose: guidance for AI coding agents working on this repo -->
# Copilot instructions — Cipher chat UI

This project is a frontend-only, Vite + React + TypeScript UI for a minimal encrypted-chat prototype. Use this file to get productive quickly.

- **High-level architecture:** Vite-powered SPA using React + TypeScript. Top-level app is [src/app/App.tsx](src/app/App.tsx) which owns in-memory state: `rooms`, `activeRoomCode`, and `messagesByRoom` (messages are simulated, no backend). UI is split into a left `Sidebar` and a right `MainChatArea` with small modal components for create/join flows.

- **Where to look first:**
  - Entry: [src/main.tsx](src/main.tsx)
  - App state & flows: [src/app/App.tsx](src/app/App.tsx)
  - Components: [src/app/components/*](src/app/components)
  - UI primitives / design tokens: [src/app/ui](src/app/ui)
  - Global styles: [src/styles/index.css](src/styles/index.css) and [src/styles/tailwind.css](src/styles/tailwind.css)

- **Build & dev workflows**
  - Install: `npm install` (the project has `pnpm` metadata but works with npm/yarn). 
  - Dev server: `npm run dev` (runs `vite`).
  - Production build: `npm run build` (runs `vite build`).
  - Preview a build: `npx vite preview` or serve the `dist` directory.
  - Vite config: alias `@` → `src` (see `vite.config.ts`) — prefer `@/...` when adding imports.

- **Styling & conventions**
  - Tailwind is used alongside occasional inline `style` props; follow existing mix: layout via Tailwind classes, fine visual tweaks via `style={{...}}` where present.
  - Typography: Inter for UI text, monospace (JetBrains Mono) for room codes — consistent with `App.tsx` and `Sidebar.tsx`.
  - Component pattern: small, focused function components in `src/app/components`, named exports. Avoid large files — split logic between component and small internal hooks if needed.

- **Data flow & state**
  - Single-source UI state lives in `App.tsx`. New features that require app-wide state should either sit in `App.tsx` or be lifted there.
  - Message storage is in-memory (`messagesByRoom: Record<string, Message[]>`); persistence/back-end integration does not exist yet — add adapters (services) in a new `src/app/services` folder if integrating a real backend.

- **Important patterns & project-specific notes**
  - The UI was designed from a spec in `src/imports/cipher-chat-ui.tsx` — use it as the authoritative design reference for spacing, colors, and behaviors.
  - Radix and other small primitives are used via wrappers in `src/app/ui/*`. Reuse those primitives for consistency (buttons, dialogs, inputs).
  - Icons use `lucide-react` across components.

- **Dependencies & compatibility**
  - Many UI libs (Radix, MUI bits) are present; prefer existing `src/app/ui` wrappers rather than introducing new UI frameworks.
  - `peerDependencies` declare React 18.x — use React 18 dev tooling.

- **Debugging and testing**
  - There are no unit tests currently. Use the Vite dev server and React DevTools for inspection.
  - To simulate chat flows, exercise the Create/Join modal flows in the running app — replies are simulated in `App.tsx` (look for `setTimeout` reply logic).

- **When making changes**
  - Keep components small; add new UI primitives to `src/app/ui` and reuse them.
  - Respect the `@` alias when importing (configured in `vite.config.ts`).
  - Update `src/styles` for global style changes and keep theme colors consistent with the accent `#6366f1` used throughout.

- **Examples & quick references**
  - Top-level state example: `messagesByRoom` lives in [src/app/App.tsx](src/app/App.tsx).
  - Sidebar component: [src/app/components/Sidebar.tsx](src/app/components/Sidebar.tsx) — uses monospace for codes and shows `Create/Join` flows.
  - Main chat area: [src/app/components/MainChatArea.tsx](src/app/components/MainChatArea.tsx) — input handling and message rendering.

If anything here is unclear or you want more examples (import patterns, sample PR checklist, or a quick code snippet showing the preferred button/primitive usage), tell me which area to expand and I'll update this file.
