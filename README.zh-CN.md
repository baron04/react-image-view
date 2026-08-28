# react-img-view

[English](README.md)

[![npm version](https://img.shields.io/npm/v/react-img-view.svg)](https://www.npmjs.com/package/react-img-view)
[![minzipped size](https://img.shields.io/bundlephobia/minzip/react-img-view)](https://bundlephobia.com/package/react-img-view)
[![license](https://img.shields.io/npm/l/react-img-view.svg)](LICENSE)

一个 headless-first、可组合，同时提供可选精致预设的 **React 图片查看器**组件——
为审阅文档附件、后台图片字段这类场景设计，不是拿来做相册轮播的。缩放、拖拽、
双指缩放、旋转、适应窗口与 1:1、键盘快捷键、触摸手势都有，每一个可见部分都能替换。

**[文档](https://baron04.github.io/react-img-view/zh/)** ·
[快速开始](https://baron04.github.io/react-img-view/zh/quick-start/) ·
[API 参考](https://baron04.github.io/react-img-view/zh/api-reference/)

```bash
npm install react-img-view
```

```tsx
import { ImageView } from 'react-img-view'
import 'react-img-view/styles.css'

function AttachmentPreview({ file }) {
  return (
    <ImageView src={file.full} alt={file.name}>
      <img src={file.thumb} alt={file.name} />
    </ImageView>
  )
}
```

单张图片一行代码，一组图片一个组件，需要自定义界面时也能完全展开来写——三种
用法都在[文档](https://baron04.github.io/react-img-view/zh/quick-start/)里。

需要函数式调用时，从 `react-img-view/imperative` 引入 `ImagePreview`，直接调用
`ImagePreview.open({ images, index })`。不需要 Provider；关闭后临时宿主会自动清理。

完整入口为 **11.6 kB gzip**。自定义界面可从
`react-img-view/primitives` 引入无默认外观的部件（**10.4 kB gzip**）；底层变换
与手势状态机位于 `react-img-view/core`，只使用一个 helper 时可 tree-shake 到约
**0.5 kB**。压缩后的 CSS 预设为 **1.7 kB gzip**。这些数字都有 CI 体积门禁。

默认文案固定为英文，不再读取浏览器语言，保证 SSR 与 hydration 一致。中文按需引入：

```tsx
import zhCN from 'react-img-view/locales/zh-CN'

function ChineseViewer({ files }) {
  return <ImageView.Root images={files} labels={zhCN} />
}
```

![缩放、旋转、适应窗口，逐张翻看附件](media/demo.gif)

## 为什么做这个

市面上大多数 React 图片查看器是照着"刷图"的场景做的：工具栏会自动隐藏、支持
自动播放、随手一划就能关掉。但审阅文档附件是另一回事——工具栏得一直留在那，
需要一个专门的 **1:1** 按钮，双指缩放要能在手势进行到一半时无缝切换到翻页，
划走关闭也只认触摸操作，鼠标拖拽误触不会把查看器关掉。每一处默认行为背后的
取舍，写在了[设计与 Registry](https://baron04.github.io/react-img-view/zh/design-and-registry/)里。

## 两种拿到界面的方式

一份 CSS 预设（`react-img-view/styles.css`，哪都能用），或者一份用 Tailwind
写的 [shadcn registry 组件](registry/)，作为可编辑的源码装进项目里。同一套设计、
同一套 tokens，分发方式你来选。

## 已知的局限

手势相关的每一个常量——拖拽超出多少距离才会交给翻页、快速滑动的衰减力度、
触控板双指缩放的速率——都在 [`src/core/tuning.ts`](src/core/tuning.ts) 里。
这些参数在模拟环境里跑得很充分（单元测试里回放指针事件序列、真实浏览器里
派发合成的触摸/双指手势、移动端宽度和触摸模拟视口），也在一台真实手机上
完整走过一遍，双指缩放、拖拽转翻页、下拉关闭手感都对。但这只是一台设备，
不是一个设备矩阵——延迟、屏幕尺寸、手指摩擦力在不同硬件上差异不小，所以
仍然值得在你手头的设备上试试。如果某个手势感觉不对，`tuning.ts` 就是要改的
那个文件——一个改动其中某个数值的 PR，附上是在什么设备上试出来的，正是这个
项目现在最需要的贡献。

## 参与贡献

开发环境搭建、仓库目录结构、发布流程都写在 [CONTRIBUTING.md](CONTRIBUTING.md)
里（英文）——包括两条这个项目踩过坑才总结出来的测试原则，都是曾经真的发到
npm 上的 bug。

版本历史见 [CHANGELOG.md](CHANGELOG.md)（英文）。

## 许可证

MIT，见 [LICENSE](LICENSE)。
