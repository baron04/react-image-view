'use client'

import * as React from 'react'
import { ImageView, type ImageItem } from 'react-img-view'

/**
 * The default react-img-view UI, restyled with Tailwind for editing in
 * place. Behaviour — the gesture engine, the modal, keyboard, FLIP — stays
 * in the npm package; only presentation is copied into your project. This is
 * the same composition `DefaultContent` in the package assembles, so it
 * stays a faithful starting point rather than a second, drifting design.
 *
 * Swap classNames freely: every part still ships its behaviour and its
 * `data-*` state (`data-active`, `data-boundary`, `data-state`) regardless
 * of what you style it with.
 */

/* ------------------------------- icons ---------------------------------- */
/* 20px grid, 1.5px stroke, round caps — one vocabulary, copied in full so
   this file has nothing left to import for visuals. */

function Icon({
  children,
  size = 19,
  className,
}: {
  children: React.ReactNode
  size?: number
  className?: string
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
    >
      {children}
    </svg>
  )
}

const CloseIcon = (p: { size?: number }) => (
  <Icon {...p}>
    <path d="M5.5 5.5l9 9M14.5 5.5l-9 9" />
  </Icon>
)
const PrevIcon = (p: { size?: number }) => (
  <Icon {...p}>
    <path d="M12.5 4.5L7 10l5.5 5.5" />
  </Icon>
)
const NextIcon = (p: { size?: number }) => (
  <Icon {...p}>
    <path d="M7.5 4.5L13 10l-5.5 5.5" />
  </Icon>
)
const ZoomOutIcon = (p: { size?: number }) => (
  <Icon {...p}>
    <circle cx={8.7} cy={8.7} r={5.4} />
    <path d="M12.7 12.7L16.8 16.8M6.4 8.7h4.6" />
  </Icon>
)
const ZoomInIcon = (p: { size?: number }) => (
  <Icon {...p}>
    <circle cx={8.7} cy={8.7} r={5.4} />
    <path d="M12.7 12.7L16.8 16.8M6.4 8.7h4.6M8.7 6.4v4.6" />
  </Icon>
)
const RotateLeftIcon = (p: { size?: number }) => (
  <Icon {...p}>
    <path d="M3.6 10a6.4 6.4 0 1 1 1.9 4.5" />
    <path d="M3.2 6.2v3.9h3.9" />
  </Icon>
)
const RotateRightIcon = (p: { size?: number }) => (
  <Icon {...p}>
    <path d="M16.4 10a6.4 6.4 0 1 0-1.9 4.5" />
    <path d="M16.8 6.2v3.9h-3.9" />
  </Icon>
)
const FitIcon = (p: { size?: number }) => (
  <Icon {...p}>
    <path d="M3 7V3h4M17 7V3h-4M3 13v4h4M17 13v4h-4" />
  </Icon>
)
const DownloadIcon = (p: { size?: number }) => (
  <Icon {...p}>
    <path d="M10 3.5v8.5M6.6 8.8L10 12.2l3.4-3.4M4 14.2v2.3h12v-2.3" />
  </Icon>
)
const RetryIcon = (p: { size?: number }) => (
  <Icon {...p}>
    <path d="M16.4 10a6.4 6.4 0 1 1-1.9-4.5" />
    <path d="M16.8 2.6v3.9h-3.9" />
  </Icon>
)
const AlertIcon = (p: { size?: number }) => (
  <Icon {...p}>
    <path d="M10 4.2L17.5 16.5h-15z" />
    <path d="M10 9v3.2M10 14.4v.1" />
  </Icon>
)
/** "1:1" as a lettered glyph in a stroked frame — see the design notes: a
 *  bare-text button was the one outlier in an all-icon toolbar, and a
 *  wordless pictogram had no agreed meaning to lean on. */
function ActualSizeIcon({ size = 19 }: { size?: number }) {
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
    >
      <rect x={3} y={3} width={14} height={14} rx={2.6} />
      <text
        x={10}
        y={12.45}
        textAnchor="middle"
        fontSize={6.4}
        fontWeight={600}
        fill="currentColor"
        stroke="none"
        letterSpacing="-.15"
        className="font-mono"
      >
        1:1
      </text>
    </svg>
  )
}

/* ------------------------------ controls --------------------------------- */

const controlBase =
  'inline-flex h-8 min-w-8 items-center justify-center gap-1.5 rounded-md px-1.5 text-[color:var(--riv-ink)] transition-colors ' +
  'hover:bg-[color:var(--riv-hover)] disabled:pointer-events-none disabled:opacity-50 ' +
  'focus-visible:outline-2 focus-visible:outline-[color:var(--riv-accent)] focus-visible:outline-offset-2'

const toolbarButton =
  controlBase + ' data-[active]:bg-[color:var(--riv-accent-surface)] data-[active]:text-[color:var(--riv-accent)]'

/* -------------------------------- shell ----------------------------------- */

export interface ImagePreviewProps {
  images: ImageItem[]
  /** Uncontrolled by default; pass both for a controlled viewer. */
  open?: boolean
  onOpenChange?: (open: boolean) => void
  index?: number
  onIndexChange?: (index: number) => void
  /** See the package docs — off by default, matching the reviewed design. */
  counter?: boolean
  thumbnails?: boolean | 'auto' | 'always' | 'never'
  children: React.ReactNode
}

export function ImagePreview({
  images,
  open,
  onOpenChange,
  index,
  onIndexChange,
  counter = false,
  thumbnails = false,
  children,
}: ImagePreviewProps) {
  return (
    <ImageView.Root
      images={images}
      open={open}
      onOpenChange={onOpenChange}
      index={index}
      onIndexChange={onIndexChange}
    >
      {children}

      <ImageView.Content className="fixed inset-0 m-0 h-dvh max-h-dvh w-screen max-w-none overflow-hidden border-0 bg-[color:var(--riv-chrome)] p-0 text-[color:var(--riv-ink)] backdrop:bg-black/32 open:animate-in open:fade-in open:duration-200">
        <div className="flex h-full flex-col">
          <ImageView.Header className="flex h-12 flex-none items-center gap-3 overflow-hidden border-b border-[color:var(--riv-line)] bg-[color:var(--riv-chrome)] px-2 pl-2">
            <ImageView.Close className="inline-flex h-8 items-center gap-1.5 rounded-md px-2.5 pl-2 text-sm text-[color:var(--riv-ink)] hover:bg-[color:var(--riv-hover)]">
              <CloseIcon size={18} />
              关闭
            </ImageView.Close>
            <span className="h-[18px] w-px flex-none bg-[color:var(--riv-line)]" />
            <ImageView.Title className="min-w-0 truncate text-[13.5px] font-medium" />
            {counter && (
              <ImageView.Counter className="flex-none font-mono text-[11.5px] tabular-nums text-[color:var(--riv-ink-muted)]" />
            )}
            <span className="min-w-2 flex-1" />
            <ImageView.Download className="inline-flex h-8 flex-none items-center gap-1.5 rounded-md border border-[color:var(--riv-line)] bg-[color:var(--riv-chrome)] px-3 text-sm text-[color:var(--riv-ink)] no-underline hover:bg-[color:var(--riv-hover)]">
              <DownloadIcon size={16} />
              下载
            </ImageView.Download>
          </ImageView.Header>

          <ImageView.Stage className="relative min-h-0 flex-1 bg-[color:var(--riv-stage)]">
            <ImageView.Image />

            <ImageView.Prev className="absolute top-1/2 left-2.5 z-10 flex h-24 w-14 -translate-y-1/2 items-center justify-center rounded-lg border-0 bg-transparent text-[color:var(--riv-ink-muted)] hover:bg-white/74 hover:text-[color:var(--riv-ink)] data-[boundary]:hidden [@media(pointer:coarse)]:w-16">
              <PrevIcon size={22} />
            </ImageView.Prev>
            <ImageView.Next className="absolute top-1/2 right-2.5 z-10 flex h-24 w-14 -translate-y-1/2 items-center justify-center rounded-lg border-0 bg-transparent text-[color:var(--riv-ink-muted)] hover:bg-white/74 hover:text-[color:var(--riv-ink)] data-[boundary]:hidden [@media(pointer:coarse)]:w-16">
              <NextIcon size={22} />
            </ImageView.Next>

            <ImageView.Loading className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-[color:var(--riv-ink-muted)]">
              <svg className="h-[26px] w-[26px] animate-spin motion-reduce:animate-[spin_2.4s_linear_infinite]" viewBox="0 0 26 26" fill="none">
                <circle cx="13" cy="13" r="10" className="stroke-[color:var(--riv-line)]" strokeWidth="2.4" />
                <path d="M13 3a10 10 0 0 1 8.66 5" className="stroke-[color:var(--riv-accent)]" strokeWidth="2.4" strokeLinecap="round" />
              </svg>
            </ImageView.Loading>

            <ImageView.Error className="absolute inset-0 flex flex-col items-center justify-center gap-[18px] px-6 text-center text-[color:var(--riv-ink)]">
              {({ retry }) => (
                <>
                  <AlertIcon size={40} />
                  <div className="flex flex-col gap-1.5">
                    <div className="text-[15px] font-semibold">无法加载这张图片</div>
                    <div className="max-w-[40ch] text-sm leading-relaxed text-[color:var(--riv-ink-muted)]">
                      文件可能已损坏，或使用了浏览器不支持的编码格式。原始文件仍可下载后用本地工具打开。
                    </div>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <button
                      type="button"
                      onClick={retry}
                      className="inline-flex h-[34px] items-center gap-1.5 rounded-lg border border-[color:var(--riv-line)] bg-[color:var(--riv-chrome)] px-4 text-sm hover:bg-[color:var(--riv-hover)]"
                    >
                      <RetryIcon size={16} />
                      重试
                    </button>
                    <ImageView.Download className="inline-flex h-[34px] items-center gap-1.5 rounded-lg border border-[color:var(--riv-accent)] bg-[color:var(--riv-accent)] px-4 text-sm text-white no-underline">
                      <DownloadIcon size={16} />
                      下载原文件
                    </ImageView.Download>
                  </div>
                </>
              )}
            </ImageView.Error>

            <ImageView.Toolbar className="absolute bottom-[22px] left-1/2 z-10 flex h-11 -translate-x-1/2 items-center gap-1 rounded-[11px] border border-[color:var(--riv-line)] bg-[color:var(--riv-chrome)] px-1.5 shadow-[0_2px_4px_rgb(20_26_32_/_0.05),0_14px_34px_-16px_rgb(20_26_32_/_0.34)] dark:shadow-[0_18px_40px_-18px_rgb(0_0_0_/_0.9)]">
              <ImageView.ZoomOut className={toolbarButton}>
                <ZoomOutIcon />
              </ImageView.ZoomOut>
              <ImageView.ZoomIn className={toolbarButton}>
                <ZoomInIcon />
              </ImageView.ZoomIn>
              <span className="mx-1 h-[22px] w-px flex-none bg-[color:var(--riv-line)]" />
              <ImageView.RotateLeft className={toolbarButton}>
                <RotateLeftIcon />
              </ImageView.RotateLeft>
              <ImageView.RotateRight className={toolbarButton}>
                <RotateRightIcon />
              </ImageView.RotateRight>
              <span className="mx-1 h-[22px] w-px flex-none bg-[color:var(--riv-line)]" />
              <ImageView.FitToWindow className={toolbarButton}>
                <FitIcon />
              </ImageView.FitToWindow>
              <ImageView.ActualSize className={toolbarButton}>
                <ActualSizeIcon />
              </ImageView.ActualSize>
            </ImageView.Toolbar>
          </ImageView.Stage>

          {thumbnails && (
            <ImageView.Thumbnails
              mode={thumbnails === true ? 'auto' : thumbnails}
              className="flex flex-none gap-2 overflow-x-auto border-t border-[color:var(--riv-line)] bg-[color:var(--riv-chrome)] p-2.5 data-[mode=auto]:max-[640px]:hidden"
            >
              {/* Thumbnails renders its own buttons; nothing to add here. */}
            </ImageView.Thumbnails>
          )}
        </div>
      </ImageView.Content>
    </ImageView.Root>
  )
}
