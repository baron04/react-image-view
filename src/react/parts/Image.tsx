import * as React from 'react'
import { useViewerContext } from '../context'
import { paintImage, paintTrack } from '../paint'

export interface ImageProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'children'> {
  /** Slides kept mounted either side of the current one. */
  overscan?: number
}

/**
 * The slide track.
 *
 * Neighbours stay mounted because the edge handoff needs the next image to be
 * on screen before the finger lifts — a page turn that has to wait for a mount
 * is a page turn with a hole in it. Only a small window is kept, so a folder of
 * two hundred attachments still holds three nodes.
 */
export const Image = React.forwardRef<HTMLDivElement, ImageProps>(function Image(
  { overscan = 1, style, ...rest },
  forwardedRef,
) {
  const { images, api, internals } = useViewerContext('Image')
  const { index } = api
  // Pull the ref object out: it is stable for the life of the viewer, while
  // `internals` is rebuilt on every render. Depending on the container would
  // re-run the effect below on every frame of a drag and reset the track
  // underneath the gesture painting it.
  const { trackRef } = internals
  const imageElRef = React.useRef<HTMLImageElement | null>(null)

  const from = Math.max(0, index - overscan)
  const to = Math.min(images.length - 1, index + overscan)
  const window: number[] = []
  for (let i = from; i <= to; i++) window.push(i)

  // Settle the track on the current slide whenever the index changes under us,
  // whether from a drag, a keystroke, or a controlled prop.
  React.useLayoutEffect(() => {
    paintTrack(trackRef.current, index, 0)
  }, [index, trackRef])

  const current = images[index]
  const { setNatural, setStatus, reloadToken } = internals

  // Republish the natural size on every slide change.
  //
  // `onLoad` cannot carry this on its own: neighbours are already mounted and
  // decoded, so becoming the current slide fires no new load event and the
  // viewer would keep sizing the new image by the old one's dimensions —
  // wrong fit, wrong bounds, wrong zoom ceiling.
  React.useLayoutEffect(() => {
    if (!current) return
    if (current.width && current.height) {
      setNatural({ width: current.width, height: current.height })
      return
    }
    const el = imageElRef.current
    if (el?.complete && el.naturalWidth) {
      setNatural({ width: el.naturalWidth, height: el.naturalHeight })
    } else {
      // Nothing trustworthy yet; onLoad will fill it in.
      setNatural(null)
    }
  }, [index, current, setNatural])

  // A decoded neighbour is ready the moment it becomes current, so status has
  // to be settled here rather than waiting on a load event that will not fire.
  React.useEffect(() => {
    const el = imageElRef.current
    setStatus(el?.complete && el.naturalWidth ? 'ready' : 'loading')
  }, [index, reloadToken, setStatus])

  return (
    <div
      {...rest}
      ref={forwardedRef}
      data-image-view-viewport=""
      style={{ position: 'absolute', inset: 0, overflow: 'hidden', ...style }}
    >
      <div
        ref={trackRef}
        data-image-view-track=""
        style={{
          position: 'absolute',
          top: 0,
          bottom: 0,
          // Width must come from the stage, not from `inset` — pairing right:0
          // with a left offset would squeeze the track to nothing.
          width: '100%',
          display: 'flex',
          // The track is offset by whole slide widths, so it starts at the
          // first mounted neighbour rather than at slide zero.
          transform: `translate3d(${-index * 100}%, 0, 0)`,
          left: `${from * 100}%`,
          willChange: 'transform',
        }}
      >
        {window.map((i) => {
          const item = images[i]
          if (!item) return null
          const isCurrent = i === index
          return (
            <div
              key={`${item.src}-${i}-${isCurrent ? reloadToken : 0}`}
              data-image-view-slide=""
              data-current={isCurrent ? '' : undefined}
              style={{
                position: 'relative',
                flex: '0 0 100%',
                width: '100%',
                height: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                // Each slide clips its own image. The current one is laid out
                // at natural size so `scale` can mean 1:1 exactly, which makes
                // it far larger than the slide — without this it spills over
                // its neighbours.
                overflow: 'hidden',
              }}
            >
              <img
                ref={
                  isCurrent
                    ? (node) => {
                        internals.imageRef.current = node
                        imageElRef.current = node
                        if (node) paintImage(node, internals.transformRef.current)
                      }
                    : undefined
                }
                src={item.src}
                alt={item.alt ?? item.name ?? ''}
                draggable={false}
                decoding="async"
                onLoad={(event) => {
                  if (!isCurrent) return
                  const el = event.currentTarget
                  internals.setNatural({ width: el.naturalWidth, height: el.naturalHeight })
                  setStatus('ready')
                }}
                onError={() => {
                  if (isCurrent) setStatus('error')
                }}
                style={
                  isCurrent
                    ? {
                        // Natural layout size, so `scale` means exactly what the
                        // 1:1 control claims: one image pixel per CSS pixel.
                        width: 'auto',
                        height: 'auto',
                        maxWidth: 'none',
                        maxHeight: 'none',
                        transformOrigin: 'center center',
                        userSelect: 'none',
                        WebkitUserSelect: 'none',
                        willChange: 'transform',
                      }
                    : {
                        // Neighbours are only ever seen fitted, so CSS contain
                        // is enough and costs no measurement. It lands on the
                        // same pixels the fitted transform would, so promotion
                        // to current is invisible.
                        maxWidth: '100%',
                        maxHeight: '100%',
                        width: 'auto',
                        height: 'auto',
                        objectFit: 'contain',
                        userSelect: 'none',
                        WebkitUserSelect: 'none',
                      }
                }
              />
            </div>
          )
        })}
      </div>
    </div>
  )
})
