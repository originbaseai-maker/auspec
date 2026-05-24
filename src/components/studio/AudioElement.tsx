import { useAudioPlayer } from '@/hooks/useAudioPlayer'
import { useBPMDetection } from '@/hooks/useBPMDetection'

/**
 * Sole owner of the `<audio>` element in the studio.
 *
 * `useAudioPlayer` creates a ref and attaches a stack of event listeners
 * (timeupdate, play, pause, durationchange, ended) plus writes the element
 * into useAudioStore so the analyzer / Timeline / recorder can reach it.
 * The hook only does any of that if there's an actual DOM element behind
 * its ref, so this component must be mounted whenever an audio file is
 * loaded — and nothing else should call useAudioPlayer.
 *
 * Also runs `useBPMDetection`, which kicks off background BPM analysis
 * each time the source URL changes. Mounted here so the detection
 * lifecycle is tied to the same component that owns the audio element.
 */
export function AudioElement() {
  const { audioRef } = useAudioPlayer()
  useBPMDetection()
  return <audio ref={audioRef} preload="metadata" className="hidden" />
}

export default AudioElement
