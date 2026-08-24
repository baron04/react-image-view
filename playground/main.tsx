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
  const v = useViewer()
  const atFit = Math.abs(v.scale - v.fitScale) < 1e-3
  const atOne = Math.abs(v.scale - 1) < 1e-3
  return (
    <div className="toolbar">
      <button onClick={() => v.zoomBy(1 / 1.4)} disabled={!v.canZoomOut}>-</button>
      <button onClick={() => v.zoomBy(1.4)} disabled={!v.canZoomIn}>+</button>
      <i />
      <button onClick={() => v.rotate(-90)}>rotL</button>
      <button onClick={() => v.rotate(90)}>rotR</button>
      <i />
      <button onClick={() => v.fit()} data-active={atFit ? '' : undefined}>适应窗口</button>
      <button onClick={() => v.actualSize()} data-active={atOne ? '' : undefined}>1:1</button>
    </div>
  )
}

function App() {
  const [open, setOpen] = React.useState(false)
  const [index, setIndex] = React.useState(0)

  return (
    <main>
      <h1>react-img-view</h1>
      <p className="hint">点击缩略图打开。放大后拖到边缘继续拖，应当接力翻页且中途不停顿。</p>
      <ImageView.Root
        images={images}
        open={open}
        index={index}
        onOpenChange={setOpen}
        onIndexChange={setIndex}
      >
        <div className="grid">
          {images.map((img, i) => (
            <button key={img.src} className="thumb" data-testid={`thumb-${i}`} onClick={() => { setIndex(i); setOpen(true) }}>
              <img src={img.src} alt={img.name} />
              <span>{img.name}</span>
            </button>
          ))}
        </div>

        <ImageView.Content>
          <div className="shell">
            <header className="topbar">
              <button className="ghost" data-testid="close" onClick={() => setOpen(false)}>关闭</button>
              <span className="sep" />
              <span className="title">{images[index]?.name}</span>
              <span className="spacer" />
              <Readout />
            </header>
            <ImageView.Stage className="stage">
              <ImageView.Image />
            </ImageView.Stage>
            <Toolbar />
          </div>
        </ImageView.Content>
      </ImageView.Root>
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
