# Phase 10 — Supabase Integration

## Goal
Connect backend: auth, database, file storage.

## Status
- [ ] Not Started

## Setup
- Supabase client initialized
- Environment variables configured

## Auth
- Email login
- Email signup
- Session management

## Database Tables
- `projects` — project metadata
- `project_settings` — visual settings per project
- `presets` — user-created presets

## Storage Buckets
- `audio-files` — uploaded audio
- `cover-images` — cover art and logos
- `exports` — exported video files

## User Actions
- Save project
- Load project
- Rename project
- Delete project

## Environment Variables
```env
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
```

## ⚠️ Important
Supabase Free Plan has a 50MB file size limit per upload.
Plan for chunked upload or Pro plan for large audio files.

## Dependencies
- Phase 9 complete

## Notes
