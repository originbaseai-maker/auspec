import type {
  CircularLayer,
  FillFit,
  FillSource,
  Layer,
  LogoLayerConfig,
  PolygonLayer,
  ShapeLayer,
} from '@/types/layer'

/**
 * Unified read-side view over each container layer's fill fields.
 *
 * Container layers don't share a single fill-source field — Shape
 * uses `fillType/fillColor/imageSrc/videoAssetId/imageFit`; Circular
 * and Polygon use parallel `videoFillEnabled/imageFillEnabled` etc.
 * This helper hides those differences behind the FillSource union.
 *
 * Callers that need to render or display fill source data should
 * branch on the returned `kind`, never on layer.type. New container
 * types can be added by extending this function, and every downstream
 * consumer (UI, bidirectional connections) lights up automatically.
 *
 * Returns null for non-fillable container types (anything not in the
 * Shape/Circular/Polygon set). Bloom + Halo aren't fillable in this
 * batch — see the report's deferred-work note for the rationale.
 */
export function getFillSource(layer: Layer): FillSource | null {
  if (layer.type === 'shape') {
    return shapeFillSource(layer)
  }
  if (layer.type === 'circular') {
    return circularFillSource(layer)
  }
  if (layer.type === 'polygon') {
    return polygonFillSource(layer)
  }
  return null
}

function shapeFillSource(layer: ShapeLayer & Layer): FillSource {
  const cfg = layer.config
  switch (cfg.fillType) {
    case 'color':
      return {
        kind: 'color',
        color: cfg.fillColor,
        opacity: cfg.fillOpacity,
      }
    case 'gradient':
      return {
        kind: 'gradient',
        color: cfg.fillColor,
        color2: cfg.fillColor2,
        angle: cfg.gradientAngle,
        opacity: cfg.fillOpacity,
      }
    case 'video':
      return {
        kind: 'video',
        assetId: cfg.videoAssetId ?? '',
        fit: cfg.imageFit as FillFit,
        opacity: cfg.fillOpacity,
      }
    case 'image':
      return {
        kind: 'image',
        imageSrc: cfg.imageSrc,
        // Shape stores image inline (data URL upload); no Logo-layer
        // reference in the legacy schema. Image bidirectional
        // connections from Shape go through the inline path only.
        logoLayerId: null,
        fit: cfg.imageFit as FillFit,
        opacity: cfg.fillOpacity,
      }
    case 'none':
      return { kind: 'none' }
  }
}

function circularFillSource(layer: CircularLayer & Layer): FillSource {
  const cfg = layer.config
  // Video wins over image when both flags are accidentally on — the
  // panel UI prevents this, but a defensive priority keeps the
  // renderer's output deterministic even with bad data.
  if (cfg.videoFillEnabled && cfg.videoFillAssetId) {
    return {
      kind: 'video',
      assetId: cfg.videoFillAssetId,
      fit: (cfg.videoFillFit ?? 'cover') as FillFit,
      opacity: 1,
    }
  }
  if (cfg.imageFillEnabled) {
    return {
      kind: 'image',
      imageSrc: cfg.imageFillSrc ?? null,
      logoLayerId: cfg.imageFillLogoLayerId ?? null,
      fit: (cfg.imageFillFit ?? 'cover') as FillFit,
      opacity: 1,
    }
  }
  return { kind: 'none' }
}

function polygonFillSource(layer: PolygonLayer & Layer): FillSource {
  const cfg = layer.config
  if (cfg.videoFillEnabled && cfg.videoFillAssetId) {
    return {
      kind: 'video',
      assetId: cfg.videoFillAssetId,
      fit: (cfg.videoFillFit ?? 'cover') as FillFit,
      opacity: 1,
    }
  }
  if (cfg.imageFillEnabled) {
    return {
      kind: 'image',
      imageSrc: cfg.imageFillSrc ?? null,
      logoLayerId: cfg.imageFillLogoLayerId ?? null,
      fit: (cfg.imageFillFit ?? 'cover') as FillFit,
      opacity: 1,
    }
  }
  return { kind: 'none' }
}

/**
 * Find every container layer using a given video asset as its fill.
 * Used by the bidirectional UI in VideoPanel ("Used as fill in: …")
 * to surface the inverse of the container → video connection.
 *
 * Standalone Video layers and Logo layers that USE the video as
 * their own content (videoAssetId) are intentionally NOT included —
 * those are users of the video, not containers filled by it. The
 * VideoAssetsModal exposes those via its broader getConnectedLayers
 * function (it covers both senses); this helper is fill-specific.
 */
export function getVideoFillContainers(
  layers: Layer[],
  videoAssetId: string,
): Layer[] {
  return layers.filter((l) => {
    const fill = getFillSource(l)
    if (!fill) return false
    return fill.kind === 'video' && fill.assetId === videoAssetId
  })
}

/**
 * Find every container layer using a given Logo layer as its image
 * fill source. Powers the bidirectional list in LogoPanel.
 *
 * Inline-imageSrc image fills (data-URL uploaded directly on the
 * container) are NOT discoverable here — they're not "assets" in
 * the connection sense. Only containers that reference a Logo
 * layer's image surface in the LogoPanel.
 */
export function getImageFillContainers(
  layers: Layer[],
  logoLayerId: string,
): Layer[] {
  return layers.filter((l) => {
    const fill = getFillSource(l)
    if (!fill) return false
    return fill.kind === 'image' && fill.logoLayerId === logoLayerId
  })
}

/**
 * Resolve the actual displayable image URL for an `image`-kind
 * fill, preferring the referenced Logo layer's imageSrc when set so
 * the user updating the Logo cascades to every container using it.
 * Falls back to the inline imageSrc when no Logo is referenced (or
 * the reference dangles after Logo removal — graceful fallback).
 */
export function resolveImageFillSrc(
  fill: FillSource & { kind: 'image' },
  layers: Layer[],
): string | null {
  if (fill.logoLayerId) {
    const logo = layers.find(
      (l): l is Layer & { type: 'logo'; config: LogoLayerConfig } =>
        l.type === 'logo' && l.id === fill.logoLayerId,
    )
    if (logo?.config.imageSrc) return logo.config.imageSrc
    // Reference dangles (Logo removed/cleared) — fall through to
    // inline. Renderer handles the still-null case by drawing
    // nothing rather than crashing.
  }
  return fill.imageSrc
}
