# Phase 12 — Export System

## Goal
Users can export their visualization as a video file.

## Status
- [ ] Not Started

## Initial Export Specs
- Format: WebM
- API: MediaRecorder
- Resolution: 720p
- Max duration: 30 seconds

## UI
- Download button
- Progress indicator
- Export complete state

## ⚠️ Known Limitation
MediaRecorder / WebM does NOT work in Safari.
Full cross-browser export requires Railway FFmpeg Worker (Phase 15).

## Dependencies
- Phase 11 complete

## Notes
