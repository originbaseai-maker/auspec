// Module-level registry so the recorder can grab the canvas without
// prop-drilling through React. VisualizerCanvas writes in/out on mount.

let _canvas: HTMLCanvasElement | null = null

export const canvasRegistry = {
  set: (canvas: HTMLCanvasElement | null) => {
    _canvas = canvas
  },
  get: (): HTMLCanvasElement | null => _canvas,
}
