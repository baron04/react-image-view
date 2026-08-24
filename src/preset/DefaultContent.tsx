import { Content } from '../react/parts/Content'
import { Stage } from '../react/parts/Stage'
import { Image } from '../react/parts/Image'
import { Header, Toolbar, Title, Counter, Loading, ErrorState } from '../react/parts/containers'
import { Thumbnails, type ThumbnailsMode } from '../react/parts/Thumbnails'
import {
  Close, Prev, Next, ZoomIn, ZoomOut, RotateLeft, RotateRight,
  FitToWindow, ActualSize, Download,
} from '../react/parts/controls'
import {
  CloseIcon, PrevIcon, NextIcon, ZoomInIcon, ZoomOutIcon,
  RotateLeftIcon, RotateRightIcon, FitIcon, ActualSizeIcon,
  DownloadIcon, RetryIcon, AlertIcon,
} from './icons'

export interface DefaultContentProps {
  /** Show the position in the set — off by default; see the design decisions
   *  doc for why: with the handful of attachments this is built for, the
   *  arrows already say whether there is more. */
  counter?: boolean
  /**
   * Show the thumbnail strip. Off by default for the same reason `counter`
   * is — this library's primary scenario is a handful of attachments, where
   * the arrows and (optionally) the counter already say what a strip would.
   * Pass `true` for its default `auto` behaviour, or a mode directly for
   * `always`/`never`.
   */
  thumbnails?: boolean | ThumbnailsMode
  /** Text shown under the alert icon while the current image failed to load. */
  errorTitle?: string
  errorHint?: string
}

/**
 * The reviewed, tokens-matched default UI. This is what L1 and L2 render, and
 * what the copy-paste registry entry starts from — there is no private
 * assembly underneath it that a rebuild from parts could not also produce.
 */
export function DefaultContent({
  counter = false,
  errorTitle = '无法加载这张图片',
  errorHint = '文件可能已损坏，或使用了浏览器不支持的编码格式。原始文件仍可下载后用本地工具打开。',
  thumbnails = false,
}: DefaultContentProps) {
  const thumbnailsMode: ThumbnailsMode | false =
    thumbnails === true ? 'auto' : thumbnails === false ? false : thumbnails

  return (
    <Content>
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
        <Header>
          <Close>
            <CloseIcon size={18} />
            关闭
          </Close>
          <span className="riv-sep" />
          <Title />
          {counter && <Counter />}
          <span className="riv-spacer" />
          <Download>
            <DownloadIcon size={16} />
            下载
          </Download>
        </Header>

        <Stage>
          <Image />
          <Prev>
            <PrevIcon size={22} />
          </Prev>
          <Next>
            <NextIcon size={22} />
          </Next>
          <Loading>
            <svg className="riv-spinner" viewBox="0 0 26 26" fill="none" aria-hidden="true">
              <circle cx="13" cy="13" r="10" stroke="var(--riv-line)" strokeWidth="2.4" />
              <path d="M13 3a10 10 0 0 1 8.66 5" stroke="var(--riv-accent)" strokeWidth="2.4" strokeLinecap="round" />
            </svg>
          </Loading>
          <ErrorState>
            {({ retry }) => (
              <>
                <AlertIcon size={40} />
                <div className="riv-error-copy">
                  <div className="riv-error-title">{errorTitle}</div>
                  <div className="riv-error-hint">{errorHint}</div>
                </div>
                <div className="riv-error-actions">
                  <button type="button" data-image-view-control="retry" onClick={retry}>
                    <RetryIcon size={16} />
                    重试
                  </button>
                  <Download>
                    <DownloadIcon size={16} />
                    下载原文件
                  </Download>
                </div>
              </>
            )}
          </ErrorState>

          {/* Anchored to the stage on purpose — see the comment on why this
              moved inside it. */}
          <Toolbar>
            <ZoomOut>
              <ZoomOutIcon />
            </ZoomOut>
            <ZoomIn>
              <ZoomInIcon />
            </ZoomIn>
            <span className="riv-tbsep" />
            <RotateLeft>
              <RotateLeftIcon />
            </RotateLeft>
            <RotateRight>
              <RotateRightIcon />
            </RotateRight>
            <span className="riv-tbsep" />
            <FitToWindow>
              <FitIcon />
            </FitToWindow>
            <ActualSize>
              <ActualSizeIcon />
            </ActualSize>
          </Toolbar>
        </Stage>

        {thumbnailsMode && <Thumbnails mode={thumbnailsMode} />}
      </div>
    </Content>
  )
}
