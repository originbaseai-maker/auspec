# AuSpec — Claude Code Instructions

## Project
Audio spectrum visualizer. "Canva for music visuals."

## Tech Stack
React + Vite + TypeScript + Tailwind + shadcn/ui + Zustand + Supabase

## Key Rules
- Never use React state for animation data — canvas reads directly from analyzer
- All colors from src/lib/tokens.ts — no hardcoded hex values
- All settings through Zustand store
- Components must be typed — no `any`
- File naming: PascalCase for components, camelCase for hooks/utils

## Current Phase
Phase 1 — Foundation + UI Shell (no audio, no backend)

## Phase Docs
See _docs/ folder — full Obsidian vault with all 15 phases
