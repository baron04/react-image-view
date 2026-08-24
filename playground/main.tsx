import * as React from 'react'
import { createRoot } from 'react-dom/client'
import { ImageView, useViewer } from '../src'
import '../src/styles.css'
import './playground.css'

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

const files = [
  { name: '采购合同_扫描件_第1页.jpg', src: sheet(1, 1400, 1900), w: 1400, h: 1900 },
  { name: '发票_2026Q3.jpg', src: sheet(2, 2400, 1400), w: 2400, h: 1400 },
  { name: '资质证明.jpg', src: sheet(3, 1000, 1400), w: 1000, h: 1400 },
  { name: '验收单.jpg', src: sheet(4, 3200, 2400), w: 3200, h: 2400 },
]

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
      <ImageView.FitToWindow>适应窗口</ImageView.FitToWindow>
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
      <h2>默认预设 · L2</h2>
      <p className="hint">
        <code>&lt;ImageView.Root images={'{'}images{'}'}&gt;</code>
        ，不写 <code>Content</code>，自动得到设计稿里的默认界面。
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
      <h2>缩略图轨 · 可选</h2>
      <p className="hint">
        <code>&lt;ImageView.Root images={'{'}images{'}'}&gt;&lt;ImageView.DefaultContent thumbnails /&gt;&lt;/ImageView.Root&gt;</code>
        。窄屏下默认隐藏（<code>mode="auto"</code>），除非传 <code>thumbnails="always"</code>。
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
      <h2>单图 · L1</h2>
      <p className="hint">
        <code>&lt;ImageView src alt&gt;</code>，一行接入，无需 Root/Trigger。
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
      <h2>完全组合 · L3</h2>
      <p className="hint">自己拼界面，用于验证行为与调试。放大后拖到边缘继续拖，应当接力翻页且中途不停顿。</p>
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
              <ImageView.Close className="ghost" data-testid="close">关闭</ImageView.Close>
              <span className="sep" />
              <ImageView.Title className="title" />
              <ImageView.Counter className="counter" />
              <span className="spacer" />
              <Readout />
              <ImageView.Download className="ghost" data-testid="download">下载</ImageView.Download>
            </ImageView.Header>
            <ImageView.Stage className="stage">
              <ImageView.Image />
              <ImageView.Prev className="nav nav-prev" data-testid="prev">‹</ImageView.Prev>
              <ImageView.Next className="nav nav-next" data-testid="next">›</ImageView.Next>
              <ImageView.Loading className="overlay">载入中…</ImageView.Loading>
              <ImageView.Error className="overlay">
                {({ retry }) => (
                  <div className="err">
                    <div>无法加载这张图片</div>
                    <button onClick={retry}>重试</button>
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
