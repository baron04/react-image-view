import type { ViewerLabels } from '../types'

/** Simplified Chinese labels, opt-in so they add nothing to the default entry. */
const zhCN: ViewerLabels = {
  viewer: '图片预览',
  close: '关闭',
  prev: '上一张',
  next: '下一张',
  zoomIn: '放大',
  zoomOut: '缩小',
  rotateLeft: '向左转',
  rotateRight: '向右转',
  fitToWindow: '适应窗口',
  actualSize: '原始尺寸',
  download: '下载',
  retry: '重新加载',
  thumbnails: '全部图片',
  thumbnailAt: (index) => `第 ${index + 1} 张`,
  errorTitle: '图片加载失败',
  loading: '加载中',
}

export default zhCN
