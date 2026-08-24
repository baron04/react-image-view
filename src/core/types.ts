export interface Size {
  width: number
  height: number
}

export interface Point {
  x: number
  y: number
}

/**
 * `scale` is relative to the image's NATURAL size, so `scale === 1` is
 * literally one image pixel per CSS pixel — that is what the 1:1 control
 * asserts. "Fit to window" is therefore a computed scale, usually < 1.
 */
export interface Transform {
  scale: number
  x: number
  y: number
  /** Degrees, always a multiple of 90, normalised to [0, 360). */
  rotation: number
}

export interface Bounds {
  minX: number
  maxX: number
  minY: number
  maxY: number
}

export type Axis = 'x' | 'y'
export type Direction = -1 | 1
