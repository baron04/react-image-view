import * as React from 'react'
import { createRoot, type Root as ReactRoot } from 'react-dom/client'
import type { ImageItem, ImageViewRootProps, ViewerApi } from '../types'
import { Root } from '../react/parts/Root'
import { useViewer } from '../react/context'
import { DefaultContent, type DefaultContentProps } from './DefaultContent'

export interface ImagePreviewOpenOptions
  extends Pick<ImageViewRootProps, 'container' | 'extensions' | 'labels'>, DefaultContentProps {
  images: ImageItem[]
  index?: number
  /** Replace the preset UI with a composition built from ImageView parts. */
  content?: React.ReactNode
}

export interface ImagePreviewHandle {
  close(): void
  go(index: number): void
  next(): void
  prev(): void
}

export interface ImagePreviewStatic {
  /** Open a viewer without mounting a Provider. A second call replaces it. */
  open(options: ImagePreviewOpenOptions): ImagePreviewHandle
  /** Close the active function-style viewer, if there is one. */
  close(): void
}

type PendingCommand = (api: ViewerApi) => void

interface PreviewSession {
  id: number
  host: HTMLDivElement
  root: ReactRoot
  api: ViewerApi | null
  pending: PendingCommand[]
  destroyed: boolean
}

let nextSessionId = 0
let activeSession: PreviewSession | null = null

function validIndex(index: number | undefined, total: number): number {
  if (!total) return 0
  const integer = Number.isFinite(index) ? Math.trunc(index ?? 0) : 0
  return Math.min(Math.max(integer, 0), total - 1)
}

function destroySession(session: PreviewSession): void {
  if (session.destroyed) return
  session.destroyed = true
  if (activeSession === session) activeSession = null
  session.api = null
  session.pending.length = 0
  session.root.unmount()
  session.host.remove()
}

function run(session: PreviewSession, command: PendingCommand): void {
  if (session.destroyed || activeSession !== session) return
  if (session.api) command(session.api)
  else session.pending.push(command)
}

function attachController(session: PreviewSession, api: ViewerApi): (() => void) | undefined {
  if (session.destroyed || activeSession !== session) return
  session.api = api
  const pending = session.pending.splice(0)
  for (const command of pending) command(api)

  return () => {
    if (session.api === api) session.api = null
  }
}

function ControllerBridge({ session }: { session: PreviewSession }) {
  const api = useViewer()

  React.useLayoutEffect(() => attachController(session, api), [api, session])

  return null
}

function PreviewHost({
  session,
  options,
}: {
  session: PreviewSession
  options: ImagePreviewOpenOptions
}) {
  const [open, setOpen] = React.useState(true)
  const [index, setIndex] = React.useState(() => validIndex(options.index, options.images.length))

  // Root has already committed its closed state when this effect runs. Tear
  // down on a task so React never has to unmount the root from inside its own
  // effect, which React explicitly warns against.
  React.useEffect(() => {
    if (open) return
    const timeout = window.setTimeout(() => destroySession(session), 0)
    return () => window.clearTimeout(timeout)
  }, [open, session])

  return (
    <Root
      images={options.images}
      open={open}
      onOpenChange={setOpen}
      index={index}
      onIndexChange={setIndex}
      container={options.container}
      extensions={options.extensions}
      labels={options.labels}
    >
      <ControllerBridge session={session} />
      {options.content ?? (
        <DefaultContent
          counter={options.counter}
          thumbnails={options.thumbnails}
          renderImage={options.renderImage}
        />
      )}
    </Root>
  )
}

function createHandle(session: PreviewSession | null): ImagePreviewHandle {
  if (!session) {
    return { close() {}, go() {}, next() {}, prev() {} }
  }

  return {
    close: () => run(session, (api) => api.close()),
    go: (index) => run(session, (api) => api.go(index)),
    next: () => run(session, (api) => api.next()),
    prev: () => run(session, (api) => api.prev()),
  }
}

function open(options: ImagePreviewOpenOptions): ImagePreviewHandle {
  if (typeof document === 'undefined') {
    throw new Error('ImagePreview.open() is only available in a browser.')
  }

  if (activeSession) destroySession(activeSession)
  if (!options.images.length) return createHandle(null)

  const host = document.createElement('div')
  host.hidden = true
  host.dataset.imagePreviewHost = ''
  document.body.append(host)

  const session: PreviewSession = {
    id: ++nextSessionId,
    host,
    root: createRoot(host),
    api: null,
    pending: [],
    destroyed: false,
  }
  activeSession = session
  session.root.render(<PreviewHost key={session.id} session={session} options={options} />)

  return createHandle(session)
}

function close(): void {
  const session = activeSession
  if (session) run(session, (api) => api.close())
}

export const ImagePreview: ImagePreviewStatic = { open, close }

/** Test-only cleanup. Deliberately not re-exported from the package entry. */
export function resetImagePreviewForTests(): void {
  if (activeSession) destroySession(activeSession)
}
