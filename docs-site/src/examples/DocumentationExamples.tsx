import * as React from 'react'
import { ImageView, type ImageItem, type ImageViewGroupProps } from '../../../src/index'
import { ImagePreview } from '../../../src/imperative'
import { ImageView as Headless } from '../../../src/primitives'
import zhCN from '../../../src/locales/zh-CN'

// `ImageItem` has no `thumb`: which file a trigger displays is the
// application's own data, not something the viewer needs to know about.
const images: (ImageItem & { thumb: string })[] = [
  {
    src: '/photo-full.jpg',
    thumb: '/photo-thumb.jpg',
    alt: 'Mountain lake',
    name: 'mountain-lake.jpg',
    width: 1600,
    height: 2200,
  },
]

export function SingleImageExample() {
  return (
    <ImageView src={images[0]!.src} alt={images[0]!.alt} labels={zhCN}>
      <img src="/photo-thumb.jpg" alt={images[0]!.alt} />
    </ImageView>
  )
}

export function SharedViewerExample() {
  return (
    <ImageView.Group images={images} labels={zhCN}>
      {images.map((image, index) => (
        <ImageView key={image.src} index={index} {...image}>
          <img src={image.thumb} alt={image.alt} />
        </ImageView>
      ))}
    </ImageView.Group>
  )
}

export function FunctionStyleExample() {
  return <button onClick={() => ImagePreview.open({ images, labels: zhCN })}>查看图片</button>
}

export function CustomImageExample() {
  return (
    <ImageView
      {...images[0]!}
      renderImage={({ item, imageProps }) => (
        <picture>
          <source srcSet={`${item.src}.webp`} type="image/webp" />
          <img {...imageProps} referrerPolicy="no-referrer" />
        </picture>
      )}
    >
      <img src="/photo-thumb.jpg" alt={images[0]!.alt} />
    </ImageView>
  )
}

const DesignSystemButton = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement>
>(function DesignSystemButton(props, ref) {
  return <button {...props} ref={ref} />
})

const pageWithSpace: ImageViewGroupProps['onKeyDown'] = (event, api) => {
  if (event.key !== ' ') return
  if (event.shiftKey) api.prev()
  else api.next()
  return true
}

export function ComposedViewerExample() {
  return (
    <Headless.Group images={images} labels={zhCN} onKeyDown={pageWithSpace}>
      <Headless.Content>
        <Headless.Header>
          <Headless.Close>关闭</Headless.Close>
          <Headless.Title />
          <Headless.Download>下载</Headless.Download>
        </Headless.Header>

        <Headless.Stage>
          <Headless.Image />
          <Headless.Error>{({ retry }) => <button onClick={retry}>重试</button>}</Headless.Error>
          <Headless.Toolbar>
            <Headless.ZoomIn asChild>
              <DesignSystemButton aria-label="放大">+</DesignSystemButton>
            </Headless.ZoomIn>
            <Headless.ActualSize>1:1</Headless.ActualSize>
          </Headless.Toolbar>
        </Headless.Stage>
      </Headless.Content>
    </Headless.Group>
  )
}
