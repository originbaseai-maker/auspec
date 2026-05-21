# Phase 10 — Locked Interface Contracts

> **LOCKED INTERFACES — DO NOT CHANGE AFTER AGENTS START**
>
> Phase 10 (Supabase Integration). Treat as frozen.

---

## Environment Variables

```env
# .env.local — never commit, already covered by .gitignore
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
```

`.env.local.example` should be committed with empty values as a template.

---

## Database Schema

Run in the Supabase SQL Editor (idempotent — safe to re-run individual blocks via `if not exists` where applicable):

```sql
-- Projects table
create table public.projects (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  name text not null default 'Untitled Project',
  description text,
  visualizer_config jsonb not null default '{}',
  format text not null default 'youtube',
  background_color text not null default '#000000',
  sensitivity integer not null default 75,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

-- Row-level security
alter table public.projects enable row level security;

create policy "Users can view own projects"
  on public.projects for select
  using (auth.uid() = user_id);

create policy "Users can insert own projects"
  on public.projects for insert
  with check (auth.uid() = user_id);

create policy "Users can update own projects"
  on public.projects for update
  using (auth.uid() = user_id);

create policy "Users can delete own projects"
  on public.projects for delete
  using (auth.uid() = user_id);

-- Auto-update updated_at on row change
create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger on_projects_updated
  before update on public.projects
  for each row execute procedure public.handle_updated_at();
```

Indexes recommended after first ~1k rows:

```sql
create index projects_user_id_updated_at_idx
  on public.projects (user_id, updated_at desc);
```

---

## Supabase Client

```ts
// src/lib/supabase.ts
import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!url || !anonKey) {
  // Fail loudly in dev — silent fallbacks mask config bugs.
  console.warn('[supabase] VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY missing')
}

export const supabase = createClient(url, anonKey)
```

Singleton — created once at module load, reused everywhere. Do **not** call `createClient` inside components or store actions.

---

## Auth Store

```ts
// src/store/useAuthStore.ts
import type { User } from '@supabase/supabase-js'

export interface AuthStore {
  user: User | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<{ error: string | null }>
  signUp: (email: string, password: string) => Promise<{ error: string | null }>
  signOut: () => Promise<void>
  initialize: () => void
}
```

Behavior:

- `initialize()` runs **once** on app boot (called from `main.tsx` or a top-level provider). It:
  1. Hydrates `user` from `supabase.auth.getSession()` (sets `loading: false` when done).
  2. Subscribes to `supabase.auth.onAuthStateChange` and writes `user` on every event.
- `signIn` / `signUp` return `{ error: string | null }` — never throw. The error message is the user-readable string from the Supabase response (`data.error?.message`).
- `signOut` clears `user` and lets the auth listener confirm via `SIGNED_OUT`.

---

## Project Store

```ts
// src/store/useProjectStore.ts
import type { VisualizerConfig } from '@/lib/visualizerConfig'
import type { SocialFormat } from '@/lib/socialFormats'

export interface Project {
  id: string
  name: string
  description?: string
  visualizerConfig: VisualizerConfig
  format: SocialFormat
  backgroundColor: string
  sensitivity: number
  createdAt: string  // ISO timestamp
  updatedAt: string  // ISO timestamp
}

export interface ProjectStore {
  projects: Project[]
  activeProjectId: string | null
  loading: boolean
  saveProject: (name: string) => Promise<{ error: string | null }>
  loadProjects: () => Promise<void>
  loadProject: (id: string) => void
  deleteProject: (id: string) => Promise<void>
  setActiveProjectId: (id: string | null) => void
}
```

Mapping rules between DB rows and the `Project` type — DB uses snake_case, store uses camelCase:

| DB column | Project field |
|-----------|---------------|
| `id` | `id` |
| `name` | `name` |
| `description` | `description` |
| `visualizer_config` | `visualizerConfig` |
| `format` | `format` |
| `background_color` | `backgroundColor` |
| `sensitivity` | `sensitivity` |
| `created_at` | `createdAt` |
| `updated_at` | `updatedAt` |

Helpers (recommended, not required): `rowToProject(row)` and `projectToRow(p)` in `useProjectStore.ts` to keep the mapping in one place.

### Action semantics

- **`saveProject(name)`** — reads current state from `useVisualizerStore`, `useFormatStore`, etc., upserts to `public.projects`. If `activeProjectId` is set and a matching project exists, **update** that row; otherwise **insert** a new one. Returns `{ error }` shape, never throws.
- **`loadProjects()`** — `select * from projects order by updated_at desc` (RLS scopes to the current user). Populates `projects` and sets `loading: false`. Safe to call after auth state changes.
- **`loadProject(id)`** — pure client-side: finds the project in the already-loaded `projects` list, hydrates `useVisualizerStore.applyPreset`-style into the visualizer/format/audio stores, and sets `activeProjectId`. Does **not** re-fetch from Supabase.
- **`deleteProject(id)`** — RLS-scoped delete. If `activeProjectId === id`, clears it.
- **`setActiveProjectId(id)`** — pure setter, no side effects.

---

## UI Touchpoints

This phase ships the data layer; UI integration is **deferred** to Phase 11 (Dashboard) and doesn't need to land in the same branch:

- Sign-in / Sign-up forms (Phase 11 will surface them via a modal or `/auth` route)
- Project list in the left sidebar (replaces the "Coming in Phase 10" placeholder)
- Save button in [PresetsSidebar](src/components/studio/PresetsSidebar.tsx) or [ControlsSidebar](src/components/studio/ControlsSidebar.tsx) — opens a "Save Project" modal mirroring the existing preset save flow

Phase 10's PR should land the stores + supabase client + SQL migration text in [_docs/02-Architecture/Phase10-Contracts.md](_docs/02-Architecture/Phase10-Contracts.md) **only** — no UI changes, so existing flows aren't disturbed before Phase 11.

---

## Storage Buckets (deferred)

Audio file uploads, cover-art uploads, and export blobs each need a Supabase Storage bucket. These are **not** part of this contract — they ship with their respective phases (Phase 11 dashboard / Phase 12 export). When added, they'll need their own RLS policies and CORS config.

⚠️ Supabase **free plan caps single-file uploads at 50 MB**. AuSpec's `MAX_AUDIO_SIZE` is 200 MB. Plan a chunked upload path or require Pro for files > 50 MB.

---

## Error Handling

- Store actions return `{ error: string | null }`, never throw.
- UI components surface errors inline (toast / banner) — don't `console.error` and swallow.
- Network failures (Supabase down) should fall back to local state without losing user work: e.g. `saveProject` failure keeps the unsaved config in memory and shows a retry button.

---

## Backwards Compatibility

- No existing store shape changes — `useProjectStore` is brand new.
- Existing user presets (`localStorage["auspec-user-presets"]`) remain unaffected; presets and projects are separate concepts in this phase.
- Future: a "Migrate local presets to cloud" action could push `usePresetStore.userPresets` into a `presets` table, but that's out of scope for Phase 10.
