import * as React from 'react'
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
 * Forwards its ref and spreads the rest of its props onto the `<figure>`.
 *
 * That is a requirement, not a style choice: `Trigger` renders through a Slot,
 * which clones its child and hands it the click handler, the ref it measures
 * the FLIP animation from, and `data-image-view-trigger`. A child component
 * that drops unknown props swallows all of it and the thumbnail silently does
 * nothing when clicked.
 */
const Thumb = React.forwardRef<
  HTMLElement,
  { src: string; alt: string; label: string } & React.HTMLAttributes<HTMLElement>
>(function Thumb({ src, alt, label, ...rest }, ref) {
  return (
    <figure {...rest} ref={ref} className="riv-demo-thumb">
      <img src={src} alt={alt} />
      <figcaption>{label}</figcaption>
    </figure>
  )
})

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
    <ImageView.Root images={images} labels={labelsFor(locale)}>
      <div className="riv-demo-grid">
        {images.map((img, i) => (
          <ImageView.Trigger key={img.src} index={i} {...img}>
            <Thumb src={img.thumb} alt={img.alt} label={img.name} />
          </ImageView.Trigger>
        ))}
      </div>
    </ImageView.Root>
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
        <Thumb src={img.thumb} alt={img.alt} label={img.name} />
      </ImageView>
    </div>
  )
}

/** The same viewer with the optional thumbnail strip and counter turned on. */
export function GalleryDemo({ locale = 'en' }: { locale?: DemoLocale }) {
  return (
    <ImageView.Root images={demoImages} labels={labelsFor(locale)}>
      <div className="riv-demo-grid">
        {demoImages.map((img, i) => (
          <ImageView.Trigger key={img.src} index={i} {...img}>
            <Thumb src={img.thumb} alt={img.alt} label={img.name} />
          </ImageView.Trigger>
        ))}
      </div>
      <ImageView.DefaultContent counter thumbnails />
    </ImageView.Root>
  )
}

/** Demonstrates the `labels` prop by running the whole UI in Chinese. */
export function LocalizedDemo() {
  const images = demoImages.slice(0, 2)
  return (
    <ImageView.Root images={images} labels={zhCN}>
      <div className="riv-demo-grid riv-demo-grid--two">
        {images.map((img, i) => (
          <ImageView.Trigger key={img.src} index={i} {...img}>
            <Thumb src={img.thumb} alt={img.alt} label={img.name} />
          </ImageView.Trigger>
        ))}
      </div>
    </ImageView.Root>
  )
}
