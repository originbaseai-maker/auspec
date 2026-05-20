# Phase 2 — Audio Upload + Playback

## Goal
Users can upload and play audio files locally in the browser.

## Status
- [x] Complete

## Tasks
- [x] Drag and drop upload zone
- [x] File picker fallback
- [x] Accept: mp3, wav, m4a, flac
- [x] Show filename after upload
- [x] Audio player with:
  - [x] Play / Pause
  - [x] Seek bar
  - [x] Current time display
  - [x] Duration display

## Completed
Phase 2 — Audio Upload + Playback

## Files Created
- src/types/audio.ts — AudioFile interface, AudioFormat, detectFormat, isValidAudioFile, formatFileSize, MAX_FILE_SIZE, ACCEPTED_FORMATS, ACCEPTED_MIME_TYPES
- src/store/useAudioStore.ts — Zustand store with audioFile, isPlaying, currentTime, duration, volume, audioElement + setters + cleanup()
- src/hooks/useAudioPlayer.ts — useAudioPlayer hook, syncs audio element to store, handles all events
- src/components/audio/AudioUploader.tsx — drag & drop upload zone with 5 states (idle, dragover, loading, error, hidden)
- src/components/audio/AudioPlayer.tsx — full player bar with seek, volume, play/pause, remove
- src/components/audio/index.ts — barrel export

## Files Modified
- src/pages/StudioPage.tsx — dynamic switch AudioUploader↔CanvasPlaceholder and AudioPlayerBar↔AudioPlayer
- src/components/studio/CanvasPlaceholder.tsx — shows "Ready to visualize" when audio loaded
- src/components/studio/AudioPlayerBar.tsx — upload zone now clickable with file picker

## Architecture Notes
- Audio stays local only — no cloud storage in this phase
- Object URL lifecycle owned by useAudioStore — always goes through setAudioFile or cleanup to prevent memory leaks
- Format detection uses both file extension AND MIME type (some browsers send empty MIME for .m4a)
- useAudioPlayer hook owns the HTMLAudioElement ref — store only holds reference for state subscribers

## Dependencies
- Phase 1 complete ✅

## Notes
MediaRecorder / WebM export not yet implemented — comes in Phase 12.
