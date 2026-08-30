import * as React from 'react'
import { ImageView, type Extension, type ImageItem } from '../../../src/index'
import { ImagePreview } from '../../../src/imperative'
import * as Primitives from '../../../src/primitives'
import zhCN from '../../../src/locales/zh-CN'

const images: ImageItem[] = [
  {
    src: '/photo-full.jpg',
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
          <img src={image.src} alt={image.alt} />
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

const pageWithSpace = {
  name: 'space-pages',
  onKeyDown(event, api) {
    if (event.key !== ' ') return
    if (event.shiftKey) api.prev()
    else api.next()
    return true
  },
} satisfies Extension

export function ComposedViewerExample() {
  return (
    <Primitives.Group images={images} labels={zhCN} extensions={[pageWithSpace]}>
      <Primitives.Content>
        <Primitives.Header>
          <Primitives.Close>关闭</Primitives.Close>
          <Primitives.Title />
          <Primitives.Download>下载</Primitives.Download>
        </Primitives.Header>

        <Primitives.Stage>
          <Primitives.Image />
          <Primitives.ErrorState>
            {({ retry }) => <button onClick={retry}>重试</button>}
          </Primitives.ErrorState>
          <Primitives.Toolbar>
            <Primitives.ZoomIn asChild>
              <DesignSystemButton aria-label="放大">+</DesignSystemButton>
            </Primitives.ZoomIn>
            <Primitives.ActualSize>1:1</Primitives.ActualSize>
          </Primitives.Toolbar>
        </Primitives.Stage>
      </Primitives.Content>
    </Primitives.Group>
  )
}
