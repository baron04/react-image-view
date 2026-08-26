import * as React from 'react';
import { ImageView } from 'react-img-view';
import 'react-img-view/styles.css';

/**
 * Lorem Picsum with a fixed seed per image, so the same photographs come back
 * on every build rather than the page looking different each visit.
 */
function photo(seed: string, w: number, h: number) {
  return `https://picsum.photos/seed/${seed}/${w}/${h}`;
}

/**
 * Sizes and aspect ratios are deliberately mixed — portrait, wide, and one far
 * larger than the stage. A set of identical thumbnails would demo nothing:
 * fit-to-window, 1:1, and the pan bounds only visibly differ when the images do.
 */
export const demoImages = [
  { seed: 'riv-survey', name: 'site-survey-north-elevation.jpg', width: 1400, height: 1900 },
  { seed: 'riv-damage', name: 'damage-report-wide.jpg', width: 2400, height: 1400 },
  { seed: 'riv-plate', name: 'serial-plate-closeup.jpg', width: 1000, height: 1400 },
  { seed: 'riv-delivery', name: 'delivery-condition.jpg', width: 3200, height: 2400 },
].map((f) => ({
  src: photo(f.seed, f.width, f.height),
  thumb: photo(f.seed, 320, 240),
  alt: f.name,
  name: f.name,
  width: f.width,
  height: f.height,
}));

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
  );
});

/**
 * The attachment-list case the library is actually built for: a handful of
 * files in a row, click any one to review it. This is the whole L2 API — a
 * Root, a Trigger per image, no Content written at all.
 */
export function AttachmentsDemo({ count = 4 }: { count?: number }) {
  const images = demoImages.slice(0, count);
  return (
    <ImageView.Root images={images}>
      <div className="riv-demo-grid">
        {images.map((img, i) => (
          <ImageView.Trigger key={img.src} index={i} {...img}>
            <Thumb src={img.thumb} alt={img.alt} label={img.name} />
          </ImageView.Trigger>
        ))}
      </div>
    </ImageView.Root>
  );
}

/** The one-line L1 entry point, for the single-image case. */
export function SingleImageDemo() {
  const img = demoImages[0];
  return (
    <div className="riv-demo-single">
      <ImageView src={img.src} alt={img.alt} name={img.name} width={img.width} height={img.height}>
        <Thumb src={img.thumb} alt={img.alt} label={img.name} />
      </ImageView>
    </div>
  );
}

/** The same viewer with the optional thumbnail strip and counter turned on. */
export function GalleryDemo() {
  return (
    <ImageView.Root images={demoImages}>
      <div className="riv-demo-grid">
        {demoImages.map((img, i) => (
          <ImageView.Trigger key={img.src} index={i} {...img}>
            <Thumb src={img.thumb} alt={img.alt} label={img.name} />
          </ImageView.Trigger>
        ))}
      </div>
      <ImageView.DefaultContent counter thumbnails />
    </ImageView.Root>
  );
}

/** Demonstrates the `labels` prop by running the whole UI in Chinese. */
export function LocalizedDemo() {
  const images = demoImages.slice(0, 2);
  return (
    <ImageView.Root
      images={images}
      labels={{
        viewer: '图片预览',
        close: '关闭',
        download: '下载',
        prev: '上一张',
        next: '下一张',
        zoomIn: '放大',
        zoomOut: '缩小',
        rotateLeft: '向左旋转',
        rotateRight: '向右旋转',
        fitToWindow: '适应窗口',
        actualSize: '原始尺寸',
      }}
    >
      <div className="riv-demo-grid riv-demo-grid--two">
        {images.map((img, i) => (
          <ImageView.Trigger key={img.src} index={i} {...img}>
            <Thumb src={img.thumb} alt={img.alt} label={img.name} />
          </ImageView.Trigger>
        ))}
      </div>
    </ImageView.Root>
  );
}
