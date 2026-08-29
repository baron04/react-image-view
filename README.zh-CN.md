# react-img-view

[English](README.md)

[![npm version](https://img.shields.io/npm/v/react-img-view.svg)](https://www.npmjs.com/package/react-img-view)
[![minzipped size](https://img.shields.io/bundlephobia/minzip/react-img-view)](https://bundlephobia.com/package/react-img-view)
[![license](https://img.shields.io/npm/l/react-img-view.svg)](LICENSE)

一个开箱即用、也能彻底自定义的 **React 图片预览组件**。

react-img-view 把手势、动画和状态管理封装在库里，同时把界面拆成可组合的 Headless 部件。简单场景直接使用默认界面；需要接入自己的设计系统时，可以替换按钮、图片和布局，而不用重新实现缩放与手势。

- **交互完整**：缩放、拖拽、双指捏合、旋转、适应窗口、1:1、键盘与触摸手势。
- **Headless + 可组合**：`Root`、`Content`、`Stage`、`Image` 和所有控件均可单独组合。
- **接入灵活**：支持单图、多图、受控模式和函数式调用。

**[文档](https://baron04.github.io/react-img-view/zh/)** · [快速开始](https://baron04.github.io/react-img-view/zh/quick-start/) · [API 参考](https://baron04.github.io/react-img-view/zh/api-reference/)

```bash
npm install react-img-view
```

```tsx
import { ImageView } from 'react-img-view'
import 'react-img-view/styles.css'

function ImagePreviewExample({ image }) {
  return (
    <ImageView src={image.full} alt={image.name}>
      <img src={image.thumb} alt={image.name} />
    </ImageView>
  )
}
```

单张图片一行接入，多张图片共享一个预览器；需要自定义时，再逐步展开到完整组合。具体用法见[快速开始](https://baron04.github.io/react-img-view/zh/quick-start/)。

也支持函数式调用：从 `react-img-view/imperative` 引入 `ImagePreview`，调用 `ImagePreview.open({ images, index })`。预览器关闭后会自动清理。

完整入口为 **11.6 kB gzip**。自定义界面可从 `react-img-view/primitives` 引入无默认样式的部件（**10.4 kB gzip**）；底层变换与手势状态机位于 `react-img-view/core`，只引入一个函数时可 tree-shake 到约 **0.5 kB**。压缩后的 CSS 预设为 **1.7 kB gzip**。这些入口都有 CI 体积门禁。

为了保证 SSR 与 hydration 输出一致，默认文案固定为英文。中文语言包可以按需引入：

```tsx
import zhCN from 'react-img-view/locales/zh-CN'

function ChineseViewer({ images }) {
  return <ImageView.Root images={images} labels={zhCN} />
}
```

![缩放、旋转、适应窗口，逐张预览图片](media/demo.gif)

## 为什么做这个

图片预览真正难维护的，通常不是“能不能放大”，而是需求变化之后还能不能改：工具栏要换位置，按钮要接入现有设计系统，图片要增加业务属性，或者整个布局都要重排。传统的一体式组件往往只能继续增加配置项，最后变成覆盖样式或修改源码。

react-img-view 把行为和界面分开：库负责缩放、手势、动画、键盘、焦点与加载状态，应用决定最终渲染什么。默认界面本身也由公开部件组合而成，因此从一行接入到完全自定义，用的始终是同一套能力。

## 选择合适的界面方案

- **内置预设**：引入 `react-img-view/styles.css`，直接使用完整默认界面。
- **shadcn registry**：把带 Tailwind 类名的[界面源码](registry/)安装进项目，按需修改 JSX 和样式。
- **Headless primitives**：从 `react-img-view/primitives` 引入部件，完全自行组合界面。

三种方式共享同一套状态、手势和动画实现，区别只在界面由谁维护。

## 兼容性

React 18 或 19，以及浏览器环境。发布的 JavaScript 以 ES2020 为目标，依赖 `<dialog>.showModal()`、Pointer Events 和 `ResizeObserver`，因此下限是 **Chrome 80、Firefox 98、Safari 15.4**。引入预设样式表会把下限抬到 **Chrome 111、Firefox 113、Safari 16.2** —— 工具栏的表面色用了 CSS `color-mix()`；从 `react-img-view/primitives` 自行组合界面，则仍适用较低的那条线。

## 参与贡献

开发环境搭建、仓库目录结构、发布流程都写在 [CONTRIBUTING.md](CONTRIBUTING.md) 里（英文）。

版本历史见 [CHANGELOG.md](CHANGELOG.md)（英文）。
