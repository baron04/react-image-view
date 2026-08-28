import * as React from 'react'
import { ImageView, type Extension, type ImageItem } from '../../../src/index'
import { ImagePreview } from '../../../src/imperative'
import * as Primitives from '../../../src/primitives'
import zhCN from '../../../src/locales/zh-CN'

const files: ImageItem[] = [
  {
    src: '/invoice-full.jpg',
    alt: 'Invoice 1048',
    name: 'invoice-1048.jpg',
    width: 1600,
    height: 2200,
  },
]

export function SingleImageExample() {
  return (
    <ImageView src={files[0]!.src} alt={files[0]!.alt} labels={zhCN}>
      <img src="/invoice-thumb.jpg" alt={files[0]!.alt} />
    </ImageView>
  )
}

export function SharedViewerExample() {
  return (
    <ImageView.Root images={files} labels={zhCN}>
      {files.map((file, index) => (
        <ImageView.Trigger key={file.src} index={index} {...file}>
          <img src={file.src} alt={file.alt} />
        </ImageView.Trigger>
      ))}
    </ImageView.Root>
  )
}

export function FunctionStyleExample() {
  return (
    <button onClick={() => ImagePreview.open({ images: files, labels: zhCN })}>查看附件</button>
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
    <Primitives.Root images={files} labels={zhCN} extensions={[pageWithSpace]}>
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
    </Primitives.Root>
  )
}
