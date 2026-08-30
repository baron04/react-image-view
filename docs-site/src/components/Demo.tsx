import { ImageView } from 'react-img-view'
import zhCN from 'react-img-view/locales/zh-CN'
import 'react-img-view/styles.css'

type DemoLocale = 'en' | 'zh-CN'

function labelsFor(locale: DemoLocale) {
  return locale === 'zh-CN' ? zhCN : undefined
}

/** Astro's base keeps self-hosted demo assets working under GitHub Pages. */
function photo(file: string) {
  return `${import.meta.env.BASE_URL}demo/${file}`
}

/**
 * Sizes and aspect ratios are deliberately mixed — portrait, wide, and one far
 * larger than the stage. A set of identical thumbnails would demo nothing:
 * fit-to-window, 1:1, and the pan bounds only visibly differ when the images do.
 */
export const demoImages = [
  {
    file: 'camera-portrait',
    name: 'camera-portrait.webp',
    alt: 'Woman holding a vintage camera',
    width: 1400,
    height: 1900,
  },
  {
    file: 'geothermal-landscape',
    name: 'geothermal-landscape.webp',
    alt: 'Steam rising across a green geothermal landscape',
    width: 2400,
    height: 1400,
  },
  {
    file: 'forest-journal',
    name: 'forest-journal.webp',
    alt: 'Woman writing in a journal in a sunlit forest',
    width: 1000,
    height: 1400,
  },
  {
    file: 'starry-night',
    name: 'starry-night.webp',
    alt: 'Star-filled night sky above a forest',
    width: 3200,
    height: 2400,
  },
].map((f) => ({
  src: photo(`${f.file}.webp`),
  thumb: photo(`${f.file}-thumb.webp`),
  alt: f.alt,
  name: f.name,
  width: f.width,
  height: f.height,
}))

/**
 * A list of images sharing one viewer. This is the whole L2 API — a Root, a
 * Trigger per image, and no Content written at all.
 */
export function ImageListDemo({
  count = 4,
  locale = 'en',
}: {
  count?: number
  locale?: DemoLocale
}) {
  const images = demoImages.slice(0, count)
  return (
    <ImageView.Group images={images} labels={labelsFor(locale)}>
      <div className="riv-demo-grid">
        {images.map((img, i) => (
          <ImageView key={img.src} index={i} {...img}>
            <img className="riv-demo-thumb" src={img.thumb} alt={img.alt} />
          </ImageView>
        ))}
      </div>
    </ImageView.Group>
  )
}

/** The one-line L1 entry point, for the single-image case. */
export function SingleImageDemo({ locale = 'en' }: { locale?: DemoLocale }) {
  const img = demoImages[0]
  return (
    <div className="riv-demo-single">
      <ImageView
        src={img.src}
        alt={img.alt}
        name={img.name}
        width={img.width}
        height={img.height}
        labels={labelsFor(locale)}
      >
        <img className="riv-demo-thumb" src={img.thumb} alt={img.alt} />
      </ImageView>
    </div>
  )
}

/** The same viewer with the optional thumbnail strip and counter turned on. */
export function GalleryDemo({ locale = 'en' }: { locale?: DemoLocale }) {
  return (
    <ImageView.Group images={demoImages} labels={labelsFor(locale)}>
      <div className="riv-demo-grid">
        {demoImages.map((img, i) => (
          <ImageView key={img.src} index={i} {...img}>
            <img className="riv-demo-thumb" src={img.thumb} alt={img.alt} />
          </ImageView>
        ))}
      </div>
      <ImageView.DefaultContent counter thumbnails />
    </ImageView.Group>
  )
}

/** Demonstrates the `labels` prop by running the whole UI in Chinese. */
export function LocalizedDemo() {
  const images = demoImages.slice(0, 2)
  return (
    <ImageView.Group images={images} labels={zhCN}>
      <div className="riv-demo-grid riv-demo-grid--two">
        {images.map((img, i) => (
          <ImageView key={img.src} index={i} {...img}>
            <img className="riv-demo-thumb" src={img.thumb} alt={img.alt} />
          </ImageView>
        ))}
      </div>
    </ImageView.Group>
  )
}
