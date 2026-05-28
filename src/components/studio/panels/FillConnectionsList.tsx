import { useMemo, type JSX } from 'react'
import { useLayerStore } from '@/store/useLayerStore'
import {
  getImageFillContainers,
  getVideoFillContainers,
} from '@/lib/fillSource'

interface Props {
  /** What kind of asset this list is showing connections for. */
  kind: 'video' | 'image'
  /**
   * For `kind: 'video'` this is the VideoAsset id; for `kind: 'image'`
   * it's the Logo LAYER id (the bidirectional contract treats Logo
   * layers as the canonical image-asset surface).
   */
  assetKey: string
}

/**
 * Live list of container layers using a given asset as a fill —
 * the inverse side of the connection visible inside container
 * panels. Renders once for VideoPanel ("Used as fill in: …") and
 * once for LogoPanel.
 *
 * Updates live via the useLayerStore subscription, so adding /
 * removing the connection from the container side reflects here on
 * the next render. Each row is clickable: tap → selects the
 * container layer so the user jumps directly to where the asset is
 * used.
 *
 * Renders null when there are no connections — keeps the panel
 * quiet in the common "no fills yet" case rather than always
 * occupying space with an empty heading.
 */
export function FillConnectionsList({
  kind,
  assetKey,
}: Props): JSX.Element | null {
  const layers = useLayerStore((s) => s.layers)
  const setActiveLayer = useLayerStore((s) => s.setActiveLayer)

  const containers = useMemo(() => {
    return kind === 'video'
      ? getVideoFillContainers(layers, assetKey)
      : getImageFillContainers(layers, assetKey)
  }, [kind, assetKey, layers])

  if (containers.length === 0) return null

  return (
    <div
      className="rounded-md border px-3 py-2"
      style={{
        borderColor: 'rgba(59,130,246,0.25)',
        background:
          'linear-gradient(180deg, rgba(59,130,246,0.06), rgba(139,92,246,0.06))',
      }}
    >
      <p className="mb-1.5 text-[9px] uppercase tracking-wider text-white/50">
        Used as fill in
      </p>
      <ul className="flex flex-wrap gap-1.5">
        {containers.map((c) => (
          <li key={c.id}>
            <button
              type="button"
              onClick={() => setActiveLayer(c.id)}
              className="flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] text-white/85 transition-colors hover:border-[#3b82f6]/40 hover:text-white"
              style={{ borderColor: '#2a2a2a', background: '#1a1a1a' }}
              title={`Select ${c.name}`}
            >
              <span
                className="inline-block h-1.5 w-1.5 rounded-full"
                style={{ background: '#3b82f6' }}
                aria-hidden="true"
              />
              {c.name}
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}

export default FillConnectionsList
