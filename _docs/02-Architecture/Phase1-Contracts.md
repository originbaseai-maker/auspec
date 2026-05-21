# Phase 1 — Locked Interface Contracts

> **LOCKED INTERFACES — DO NOT CHANGE AFTER AGENTS START**
>
> These contracts define the boundaries between parallel agents working on Phase 1.
> Any change requires all agents to re-sync. Treat as frozen.

---

## Route Structure (React Router)

| Path | Component | Owner |
|------|-----------|-------|
| `/` | `LandingPage` | Agent 2 |
| `/studio` | `StudioPage` | Agent 3 |
| `/dashboard` | `DashboardPage` (placeholder) | Agent 1 |

---

## Component Export Contracts

### Layout components
Agent 4 builds. All agents consume.

```ts
// src/components/layout/AppShell.tsx
export default function AppShell({ children }: { children: React.ReactNode }): JSX.Element

// src/components/layout/Sidebar.tsx
export default function Sidebar({ side, children }: { side: 'left' | 'right', children: React.ReactNode }): JSX.Element

// src/components/layout/BottomBar.tsx
export default function BottomBar({ children }: { children: React.ReactNode }): JSX.Element
```

### Shared UI tokens
Agent 4 defines. All agents use.

```ts
// src/lib/tokens.ts
export const colors = {
  bg: '#000000',
  bgSecondary: '#111111',
  surface: '#1a1a1a',
  border: '#2a2a2a',
  text: '#ffffff',
  textMuted: '#666666',
  blue: '#3b82f6',
  violet: '#8b5cf6',
  cyan: '#06b6d4',
  purple: '#a855f7',
}
```

### Page component signatures

```ts
// src/pages/LandingPage.tsx (Agent 2 builds)
export default function LandingPage(): JSX.Element

// src/pages/StudioPage.tsx (Agent 3 builds)
export default function StudioPage(): JSX.Element

// src/pages/DashboardPage.tsx (Agent 1 builds as placeholder)
export default function DashboardPage(): JSX.Element
```

---

## Zustand Store Shape

Agent 1 creates. All agents use.

```ts
// src/store/useVisualizerStore.ts
interface VisualizerStore {
  visualType: 'bars' | 'circular' | 'wave' | 'particles'
  primaryColor: string        // default: '#3b82f6'
  secondaryColor: string      // default: '#8b5cf6'
  backgroundColor: string     // default: '#000000'
  sensitivity: number         // default: 75, range: 0-100
  glowEnabled: boolean        // default: true
  canvasRatio: '16:9' | '9:16' | '1:1' | '4:5' | '21:9'  // default: '16:9'
  setVisualType: (type: VisualizerStore['visualType']) => void
  setPrimaryColor: (color: string) => void
  setSensitivity: (value: number) => void
  setGlowEnabled: (enabled: boolean) => void
  setCanvasRatio: (ratio: VisualizerStore['canvasRatio']) => void
}
```

---

## Tailwind Config Contract

- Dark mode: class-based (`darkMode: 'class'`)
- Custom colors must **extend** the default palette, not replace it
- Font: Geist Sans (primary), Geist Mono (code)

---

## File Naming Conventions

| Type | Location | Style | Extension |
|------|----------|-------|-----------|
| Pages | `src/pages/` | PascalCase | `.tsx` |
| Components | `src/components/{domain}/` | PascalCase | `.tsx` |
| Hooks | `src/hooks/` | camelCase with `use` prefix | `.ts` |
| Store | `src/store/` | camelCase with `use` prefix | `.ts` |
| Logic / utils | `src/lib/`, `src/utils/` | camelCase | `.ts` |

**Rule:** `.tsx` only for files that return JSX. Everything else is `.ts`.
