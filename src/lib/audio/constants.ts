/**
 * Central tuning constants for the audio-analysis pipeline.
 *
 * Asymmetric attack/release shapes the perceived "feel" of every
 * spectrum-driven visualiser. Fast attack catches the beat; slow
 * release lets the curve decay smoothly instead of snapping back to
 * zero between hits. Try moving ATTACK toward 1.0 for a more raw,
 * immediate read; move RELEASE toward 0.05 for longer trails.
 */
export const SPECTRUM_ATTACK = 0.6
export const SPECTRUM_RELEASE = 0.15

/**
 * Output bin count for the log-scaled spectrum delivered to renderers.
 * 64 covers the audible range with ~one bin per third of an octave —
 * dense enough to drive smooth bar visualisers, cheap enough to lerp
 * every frame. Renderers that want more granularity can interpolate.
 */
export const SPECTRUM_BINS = 64

/**
 * Audible-range bounds for log binning. The lower bound is set above
 * the analyser's DC bin so subsonic noise doesn't dominate the first
 * bucket; the upper bound matches the standard Web Audio limit.
 */
export const SPECTRUM_MIN_HZ = 20
export const SPECTRUM_MAX_HZ = 20000
