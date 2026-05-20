export type AudioFormat = 'mp3' | 'wav' | 'm4a' | 'flac' | 'unknown'

export interface AudioFile {
  file: File
  name: string
  duration: number
  size: number
  format: AudioFormat
  objectUrl: string
}

export function detectFormat(file: File): AudioFormat {
  const ext = file.name.split('.').pop()?.toLowerCase()
  const mime = file.type.toLowerCase()
  if (ext === 'mp3' || mime === 'audio/mpeg') return 'mp3'
  if (ext === 'wav' || mime === 'audio/wav') return 'wav'
  if (ext === 'm4a' || mime === 'audio/mp4' || mime === 'audio/x-m4a') return 'm4a'
  if (ext === 'flac' || mime === 'audio/flac' || mime === 'audio/x-flac') return 'flac'
  return 'unknown'
}

export function isValidAudioFile(file: File): boolean {
  return detectFormat(file) !== 'unknown'
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export const MAX_FILE_SIZE = 200 * 1024 * 1024 // 200MB
export const ACCEPTED_FORMATS = ['mp3', 'wav', 'm4a', 'flac'] as const
export const ACCEPTED_MIME_TYPES =
  'audio/mpeg,audio/wav,audio/mp4,audio/x-m4a,audio/flac,audio/x-flac'
