export interface DemoSong {
  id: string
  title: string
  artist: string
  duration: number // seconds
  url: string // path under /public/demos/ — placeholder until Suno-generated MP3s land
  genre: DemoGenre
}

export type DemoGenre =
  | 'rock_pop'
  | 'lofi'
  | 'electronic'
  | 'classical'
  | 'podcast'

export interface GenreConfig {
  id: DemoGenre
  label: string
  emoji: string
  description: string
  color: string // accent color for the genre card
}

export const DEMO_GENRES: GenreConfig[] = [
  {
    id: 'rock_pop',
    label: 'Rock / Pop',
    emoji: '🎸',
    description: 'Energetic beats — perfect for Bars & Polygon',
    color: '#ef4444',
  },
  {
    id: 'lofi',
    label: 'Lofi Hip Hop',
    emoji: '🎹',
    description: 'Chill vibes — best for Wave',
    color: '#a78bfa',
  },
  {
    id: 'electronic',
    label: 'Electronic / EDM',
    emoji: '🎛️',
    description: 'Driving sound — try Circular',
    color: '#06b6d4',
  },
  {
    id: 'classical',
    label: 'Classical / Cinematic',
    emoji: '🎻',
    description: 'Dramatic — beautiful on all visualizers',
    color: '#f59e0b',
  },
  {
    id: 'podcast',
    label: 'Podcast / Speech',
    emoji: '🎤',
    description: 'Spoken word — minimal looks shine here',
    color: '#10b981',
  },
]

// PLACEHOLDER tracks — drop matching MP3s under /public/demos/<genre>/<id>.mp3
// to make these click-to-play. Missing files surface a friendly "coming soon"
// in the UI (see DemoSongsLibrary).
export const DEMO_SONGS: DemoSong[] = [
  // Rock / Pop
  { id: 'rock-1', title: 'Neon Anthem',     artist: 'AuSpec Demo', duration: 180, url: '/demos/rock_pop/rock-1.mp3', genre: 'rock_pop' },
  { id: 'rock-2', title: 'Synthwave Drive', artist: 'AuSpec Demo', duration: 195, url: '/demos/rock_pop/rock-2.mp3', genre: 'rock_pop' },
  { id: 'rock-3', title: 'Power Chord',     artist: 'AuSpec Demo', duration: 165, url: '/demos/rock_pop/rock-3.mp3', genre: 'rock_pop' },
  { id: 'rock-4', title: 'Stadium Lights',  artist: 'AuSpec Demo', duration: 210, url: '/demos/rock_pop/rock-4.mp3', genre: 'rock_pop' },

  // Lofi
  { id: 'lofi-1', title: 'Rainy Window',    artist: 'AuSpec Demo', duration: 240, url: '/demos/lofi/lofi-1.mp3',     genre: 'lofi' },
  { id: 'lofi-2', title: 'Late Study',      artist: 'AuSpec Demo', duration: 200, url: '/demos/lofi/lofi-2.mp3',     genre: 'lofi' },
  { id: 'lofi-3', title: 'Cozy Cafe',       artist: 'AuSpec Demo', duration: 225, url: '/demos/lofi/lofi-3.mp3',     genre: 'lofi' },

  // Electronic
  { id: 'edm-1',  title: 'Pulse Wave',      artist: 'AuSpec Demo', duration: 180, url: '/demos/electronic/edm-1.mp3', genre: 'electronic' },
  { id: 'edm-2',  title: 'Bass Drop',       artist: 'AuSpec Demo', duration: 195, url: '/demos/electronic/edm-2.mp3', genre: 'electronic' },
  { id: 'edm-3',  title: 'Festival Mode',   artist: 'AuSpec Demo', duration: 220, url: '/demos/electronic/edm-3.mp3', genre: 'electronic' },
  { id: 'edm-4',  title: 'Midnight Run',    artist: 'AuSpec Demo', duration: 185, url: '/demos/electronic/edm-4.mp3', genre: 'electronic' },

  // Classical
  { id: 'cls-1',  title: 'String Quartet',  artist: 'AuSpec Demo', duration: 240, url: '/demos/classical/cls-1.mp3', genre: 'classical' },
  { id: 'cls-2',  title: 'Epic Trailer',    artist: 'AuSpec Demo', duration: 180, url: '/demos/classical/cls-2.mp3', genre: 'classical' },
  { id: 'cls-3',  title: 'Piano Solo',      artist: 'AuSpec Demo', duration: 200, url: '/demos/classical/cls-3.mp3', genre: 'classical' },

  // Podcast
  { id: 'pod-1',  title: 'Tech Talk',       artist: 'AuSpec Demo', duration: 300, url: '/demos/podcast/pod-1.mp3',   genre: 'podcast' },
  { id: 'pod-2',  title: 'Interview',       artist: 'AuSpec Demo', duration: 320, url: '/demos/podcast/pod-2.mp3',   genre: 'podcast' },
  { id: 'pod-3',  title: 'Storytelling',    artist: 'AuSpec Demo', duration: 280, url: '/demos/podcast/pod-3.mp3',   genre: 'podcast' },
]

export function getSongsByGenre(genre: DemoGenre): DemoSong[] {
  return DEMO_SONGS.filter((s) => s.genre === genre)
}

export function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${m}:${s.toString().padStart(2, '0')}`
}
