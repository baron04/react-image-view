import * as React from 'react'

/**
 * The icon set from the design spec: 20px grid, 1.5px stroke, round caps —
 * one consistent vocabulary, kept here as the single source so the preset
 * never drifts from what was signed off.
 */

interface IconProps extends React.SVGAttributes<SVGSVGElement> {
  size?: number
}

function icon(path: React.ReactNode, viewBox = '0 0 20 20') {
  const Icon = ({ size = 19, ...rest }: IconProps) => (
    <svg
      width={size}
      height={size}
      viewBox={viewBox}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...rest}
    >
      {path}
    </svg>
  )
  return Icon
}

export const CloseIcon = icon(<path d="M5.5 5.5l9 9M14.5 5.5l-9 9" />)
export const PrevIcon = icon(<path d="M12.5 4.5L7 10l5.5 5.5" />)
export const NextIcon = icon(<path d="M7.5 4.5L13 10l-5.5 5.5" />)
export const ZoomOutIcon = icon(
  <>
    <circle cx={8.7} cy={8.7} r={5.4} strokeLinecap="round" />
    <path d="M12.7 12.7L16.8 16.8M6.4 8.7h4.6" />
  </>,
)
export const ZoomInIcon = icon(
  <>
    <circle cx={8.7} cy={8.7} r={5.4} strokeLinecap="round" />
    <path d="M12.7 12.7L16.8 16.8M6.4 8.7h4.6M8.7 6.4v4.6" />
  </>,
)
export const RotateLeftIcon = icon(
  <>
    <path d="M3.6 10a6.4 6.4 0 1 1 1.9 4.5" />
    <path d="M3.2 6.2v3.9h3.9" />
  </>,
)
export const RotateRightIcon = icon(
  <>
    <path d="M16.4 10a6.4 6.4 0 1 0-1.9 4.5" />
    <path d="M16.8 6.2v3.9h-3.9" />
  </>,
)
export const FitIcon = icon(<path d="M3 7V3h4M17 7V3h-4M3 13v4h4M17 13v4h-4" />)
export const DownloadIcon = icon(
  <path d="M10 3.5v8.5M6.6 8.8L10 12.2l3.4-3.4M4 14.2v2.3h12v-2.3" />,
)
export const RetryIcon = icon(
  <>
    <path d="M16.4 10a6.4 6.4 0 1 1-1.9-4.5" />
    <path d="M16.8 2.6v3.9h-3.9" />
  </>,
)

/**
 * "1:1", drawn as a lettered glyph rather than set as text — see the design
 * spec for why: a bare-text button was the one visual outlier in an otherwise
 * all-icon toolbar, and a wordless pictogram (a pixel grid, a nested frame)
 * had no agreed-on meaning to lean on. A glyph inside a stroked frame keeps
 * the outline weight consistent with its neighbours while staying legible.
 * Rendered as an actual `<text>` node — not a hand-drawn path — because at
 * this size hinting matters more than pixel-perfect fidelity to one font.
 */
export function ActualSizeIcon({ size = 19, ...rest }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinejoin="round"
      aria-hidden="true"
      {...rest}
    >
      <rect x={3} y={3} width={14} height={14} rx={2.6} />
      <text
        x={10}
        y={12.45}
        textAnchor="middle"
        fontFamily="'IBM Plex Mono', ui-monospace, monospace"
        fontSize={6.4}
        fontWeight={600}
        fill="currentColor"
        stroke="none"
        letterSpacing="-.15"
      >
        1:1
      </text>
    </svg>
  )
}
