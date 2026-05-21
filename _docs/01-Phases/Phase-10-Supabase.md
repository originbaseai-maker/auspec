# Phase 10 — Supabase Integration

## Status
- [x] Complete

## Features
- [x] Supabase client singleton + env vars
- [x] Email/password auth (sign in, sign up, sign out)
- [x] Project save/load/delete (RLS-scoped to current user)
- [x] AuthModal + UserMenu in TopBar
- [x] DashboardPage with project grid
- [x] PresetsSidebar Projects section (5 most-recent)
- [x] Auto-load projects on auth state change

## Files Created
- src/lib/supabase.ts — singleton createClient
- src/store/useAuthStore.ts — user / signIn / signUp / signOut / initialize
- src/store/useProjectStore.ts — projects / saveProject / loadProjects / loadProject / deleteProject
- src/components/auth/AuthModal.tsx — sign in / sign up tabbed modal
- src/components/auth/UserMenu.tsx — avatar with sign-out

## Files Modified
- src/pages/StudioPage.tsx — SaveProjectControl + UserMenu/SignIn in TopBar
- src/pages/DashboardPage.tsx — project list grid replacing the placeholder
- src/components/studio/PresetsSidebar.tsx — Projects section lists 5 recent
- src/store/useAuthStore.ts — auto-loads projects on session restore + auth change
- src/main.tsx — calls useAuthStore.getState().initialize() on boot

## Architecture Notes
- Auth/Project stores expose `{ error }` returns, never throw — UI surfaces inline
- useProjectStore imports useAuthStore (for current userId); useAuthStore imports
  useProjectStore via dynamic import to break the cycle on module init
- RLS policies + auth.uid() = user_id ensure users only see their own projects
- DB columns snake_case ↔ Store fields camelCase via rowToProject helper

## Setup
1. Create a Supabase project at supabase.com
2. Run the SQL in [[Phase10-Contracts]] in the SQL Editor
3. Add to `.env.local`:
   ```
   VITE_SUPABASE_URL=https://your-project.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-key
   ```
4. `npm run dev` — Sign In button appears in TopBar

## Dependencies
- Phase 9 complete ✅
- @supabase/supabase-js added to package.json
