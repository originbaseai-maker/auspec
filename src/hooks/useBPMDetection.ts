import { useEffect } from 'react'
import { useAudioStore } from '@/store/useAudioStore'
import { detectBPM, loadAudioBufferFromUrl } from '@/lib/bpmDetector'

/**
 * Kicks off background BPM detection whenever a new audio file loads.
 * Detection is cancellable — if the user swaps the file mid-decode, the
 * in-flight result is discarded so we never write a stale BPM into the
 * store. The hook only writes when it has a positive result; failures
 * are logged but never surface to the user (the badge just falls back
 * to "—" if no BPM is set).
 *
 * Mount this exactly once in the tree, alongside the <audio> element.
 */
export function useBPMDetection() {
  const objectUrl = useAudioStore((s) => s.audioFile?.objectUrl ?? null)
  const setBpm = useAudioStore((s) => s.setBpm)
  const setBpmDetecting = useAudioStore((s) => s.setBpmDetecting)

  useEffect(() => {
    if (!objectUrl) return

    let cancelled = false
    setBpmDetecting(true)

    const run = async () => {
      try {
        const buffer = await loadAudioBufferFromUrl(objectUrl)
        if (cancelled) return

        const result = await detectBPM(buffer)
        if (cancelled) return

        if (result.bpm > 0) {
          setBpm(result.bpm, result.confidence)
        }
      } catch (err) {
        if (!cancelled) {
          console.warn('[bpm] detection failed:', err)
        }
      } finally {
        if (!cancelled) setBpmDetecting(false)
      }
    }

    void run()

    return () => {
      cancelled = true
      setBpmDetecting(false)
    }
  }, [objectUrl, setBpm, setBpmDetecting])
}
