import * as React from 'react'
import { createRoot } from 'react-dom/client'
import { ImageView, useViewer } from '../src'
import '../src/styles.css'
import './playground.css'

/**
 * Real photographs by default, via Lorem Picsum with a fixed seed per slide
 * so the same image comes back every run. `?offline=1` swaps in the locally
 * generated sheets below — the e2e suite uses it, because a CI run that fails
 * when a third-party image host has a bad minute is a flaky test, not a
 * useful signal.
 */
const OFFLINE = new URLSearchParams(location.search).has('offline')

function photo(seed: string, w: number, h: number): string {
  return `https://picsum.photos/seed/${seed}/${w}/${h}`
}

/** Generated locally so the playground never needs the network. */
function sheet(seed: number, w: number, h: number): string {
  const rows = Array.from({ length: 14 }, (_, i) => {
    const width = 40 + ((seed * (i + 3) * 37) % 55)
    return `<rect x="60" y="${170 + i * 46}" width="${(width / 100) * (w - 120)}" height="14" fill="#c9d2d8"/>`
  }).join('')
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
    <rect width="${w}" height="${h}" fill="#fdfcfa"/>
    <rect x="60" y="60" width="${w * 0.34}" height="24" fill="#2e3a42"/>
    <rect x="60" y="100" width="${w * 0.2}" height="12" fill="#b9c3c9"/>
    <rect x="60" y="140" width="${w - 120}" height="2" fill="#e4e8ea"/>
    ${rows}
    <text x="60" y="${h - 70}" font-family="monospace" font-size="34" fill="#94a3ab">sheet ${seed} - ${w}x${h}</text>
    <circle cx="${w - 130}" cy="${h - 120}" r="70" fill="none" stroke="#b4453c" stroke-width="5" opacity=".55"/>
  </svg>`
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`
}

/**
 * Deliberately mixed aspect ratios and sizes — portrait, wide, and one much
 * larger than the stage — because that is what exercises fit-to-window, the
 * 1:1 control, and the pan bounds. A set of identically-sized images makes
 * the viewer look correct when it isn't.
 */
const files = [
  { name: 'site-survey-north-elevation.jpg', seed: 'riv-survey', w: 1400, h: 1900 },
  { name: 'damage-report-wide.jpg', seed: 'riv-damage', w: 2400, h: 1400 },
  { name: 'serial-plate-closeup.jpg', seed: 'riv-plate', w: 1000, h: 1400 },
  { name: 'delivery-condition.jpg', seed: 'riv-delivery', w: 3200, h: 2400 },
].map((f, i) => ({
  ...f,
  src: OFFLINE ? sheet(i + 1, f.w, f.h) : photo(f.seed, f.w, f.h),
}))

const images = files.map((f) => ({ src: f.src, name: f.name, alt: f.name, width: f.w, height: f.h }))

function Readout() {
  const v = useViewer()
  return (
    <div className="readout" data-testid="readout">
      <span data-testid="idx">{v.index + 1} / {v.total}</span>
      <span data-testid="scale">scale {v.scale.toFixed(3)}</span>
      <span data-testid="fit">fit {v.fitScale.toFixed(3)}</span>
      <span data-testid="rot">rot {v.rotation}</span>
    </div>
  )
}

function Toolbar() {
  return (
    <ImageView.Toolbar className="toolbar">
      <ImageView.ZoomOut>-</ImageView.ZoomOut>
      <ImageView.ZoomIn>+</ImageView.ZoomIn>
      <i />
      <ImageView.RotateLeft>rotL</ImageView.RotateLeft>
      <ImageView.RotateRight>rotR</ImageView.RotateRight>
      <i />
      <ImageView.FitToWindow>fit</ImageView.FitToWindow>
      <ImageView.ActualSize>1:1</ImageView.ActualSize>
    </ImageView.Toolbar>
  )
}

/**
 * The actual preset — L2, `Root` auto-completing with `DefaultContent`. This
 * is what a consumer sees who wrote nothing beyond the triggers, and the one
 * to compare against the design spec.
 */
function DefaultDemo() {
  return (
    <section className="demo">
      <h2>Default preset · L2</h2>
      <p className="hint">
        <code>&lt;ImageView.Root images={'{'}images{'}'}&gt;</code>
         with no <code>Content</code> written — the reviewed default UI is supplied automatically.
      </p>
      <ImageView.Root images={images}>
        <div className="grid">
          {images.map((img, i) => (
            <div key={img.src} className="thumb">
              <ImageView.Trigger index={i} src={img.src} alt={img.name} name={img.name}>
                <img src={img.src} alt={img.name} data-testid={`default-thumb-${i}`} />
              </ImageView.Trigger>
              <span>{img.name}</span>
            </div>
          ))}
        </div>
      </ImageView.Root>
    </section>
  )
}

/**
 * Default preset with the thumbnail strip turned on — the opt-in gallery
 * configuration the decisions doc describes (products, a longer set), as
 * opposed to the handful-of-attachments default above.
 */
function ThumbnailsDemo() {
  return (
    <section className="demo">
      <h2>Thumbnail strip · optional</h2>
      <p className="hint">
        <code>&lt;ImageView.Root images={'{'}images{'}'}&gt;&lt;ImageView.DefaultContent thumbnails /&gt;&lt;/ImageView.Root&gt;</code>
        . Hidden on narrow screens by default (<code>mode=&quot;auto&quot;</code>) unless passed <code>thumbnails=&quot;always&quot;</code>.
      </p>
      <ImageView.Root images={images}>
        <div className="grid">
          {images.map((img, i) => (
            <div key={img.src} className="thumb">
              <ImageView.Trigger index={i} src={img.src} alt={img.name} name={img.name}>
                <img src={img.src} alt={img.name} data-testid={`gallery-thumb-${i}`} />
              </ImageView.Trigger>
              <span>{img.name}</span>
            </div>
          ))}
        </div>
        <ImageView.DefaultContent thumbnails />
      </ImageView.Root>
    </section>
  )
}

/**
 * Single-image, one-line entry point — L1. Wraps its own Root/Trigger and
 * still renders the same default content.
 */
function SingleDemo() {
  const solo = images[0]!
  return (
    <section className="demo">
      <h2>Single image · L1</h2>
      <p className="hint">
        <code>&lt;ImageView src alt&gt;</code> — one line, no Root/Trigger needed.
      </p>
      <div className="grid" style={{ maxWidth: 200 }}>
        <ImageView src={solo.src} alt={solo.alt} name={solo.name} width={solo.width} height={solo.height}>
          <div className="thumb">
            <img src={solo.src} alt={solo.alt} data-testid="solo-thumb" />
            <span>{solo.name}</span>
          </div>
        </ImageView>
      </div>
    </section>
  )
}

function AdvancedDemo() {
  const [open, setOpen] = React.useState(false)
  const [index, setIndex] = React.useState(0)

  return (
    <section className="demo">
      <h2>Full composition · L3</h2>
      <p className="hint">Assemble the UI yourself; used here to verify behaviour. Zoom in, then drag past the edge — it should hand off to the next slide without stopping.</p>
      <ImageView.Root
        images={images}
        open={open}
        index={index}
        onOpenChange={setOpen}
        onIndexChange={setIndex}
      >
        <div className="grid">
          {images.map((img, i) => (
            <div key={img.src} className="thumb">
              <ImageView.Trigger index={i} src={img.src} alt={img.name} name={img.name}>
                <img src={img.src} alt={img.name} data-testid={`thumb-${i}`} />
              </ImageView.Trigger>
              <span>{img.name}</span>
            </div>
          ))}
        </div>

        <ImageView.Content>
          <div className="shell">
            <ImageView.Header className="topbar">
              <ImageView.Close className="ghost" data-testid="close">Close</ImageView.Close>
              <span className="sep" />
              <ImageView.Title className="title" />
              <ImageView.Counter className="counter" />
              <span className="spacer" />
              <Readout />
              <ImageView.Download className="ghost" data-testid="download">Download</ImageView.Download>
            </ImageView.Header>
            <ImageView.Stage className="stage">
              <ImageView.Image />
              <ImageView.Prev className="nav nav-prev" data-testid="prev">‹</ImageView.Prev>
              <ImageView.Next className="nav nav-next" data-testid="next">›</ImageView.Next>
              <ImageView.Loading className="overlay">Loading…</ImageView.Loading>
              <ImageView.Error className="overlay">
                {({ retry }) => (
                  <div className="err">
                    <div>This image couldn&apos;t be loaded</div>
                    <button onClick={retry}>Retry</button>
                  </div>
                )}
              </ImageView.Error>
            </ImageView.Stage>
            <Toolbar />
          </div>
        </ImageView.Content>
      </ImageView.Root>
    </section>
  )
}

function App() {
  return (
    <main>
      <h1>react-img-view</h1>
      <DefaultDemo />
      <ThumbnailsDemo />
      <SingleDemo />
      <AdvancedDemo />
    </main>
  )
}

// Vite re-executes this module on every hot update; without a cached root
// each update mounts another React tree onto the same node.
declare global {
  interface Window { __rivRoot?: ReturnType<typeof createRoot> }
}
const container = document.getElementById('root')!
window.__rivRoot ??= createRoot(container)
window.__rivRoot.render(<App />)
