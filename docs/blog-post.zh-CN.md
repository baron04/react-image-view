# 为附件审阅而生：我如何设计一个可组合的 React 图片查看器

事情开始于一个看似普通的后台需求：点击采购单附件，放大核对编号，切到 1:1 看原始清晰度，再翻到下一张。真正做起来，却发现它和「浏览照片」并不是一回事。

审阅时，工具栏不能自动消失；鼠标向下拖动不该误关窗口；图片放大到边缘后，继续拖动应该自然接力到下一张。更重要的是，预览器必须能进入现有设计系统：按钮、工具栏、错误态和布局都不能锁死在库里。

于是有了 [react-img-view](https://github.com/baron04/react-img-view)：一个 headless-first、可组合，同时带可选默认界面的 React 图片查看器。**行为由库提供，呈现由应用决定。**

![缩放、旋转、适应窗口，逐张审阅附件](../media/demo.gif)

React 生态里已经有很多成熟选择。差异不在于谁「最好」，而在于各自优化的任务：

| 方案                                                                  | 更适合                                   | 主要取舍                                                        |
| --------------------------------------------------------------------- | ---------------------------------------- | --------------------------------------------------------------- |
| [PhotoSwipe](https://photoswipe.com/react-image-gallery/)             | 功能完整的图片画廊                       | 核心是原生 JavaScript；React 有官方集成示例，但不是它的核心抽象 |
| [react-photo-view](https://github.com/MinJieLiu/react-photo-view)     | 轻量、动画精致的照片预览                 | 提供工具栏渲染入口，但整体外壳仍由组件管理                      |
| [@rc-component/image](https://github.com/react-component/image)       | Ant Design 生态中的图片与预览组          | 操作栏和图片可以定制，但结构与样式约定更贴近该生态              |
| [Yet Another React Lightbox](https://yet-another-react-lightbox.com/) | 需要视频、缩略图、幻灯片等插件能力的画廊 | 能力面更广，使用完整能力时需要理解更多插件与配置                |
| **react-img-view**                                                    | 文档附件、后台图片字段、接入自有设计系统 | 专注图片审阅，不提供视频、自动播放或画廊网格                    |

这里不放一个容易过期的「谁比谁少几 KB」结论。不同库对缩放、CSS 和插件的默认包含范围并不相同；真正有意义的是固定版本、固定 import、排除 React 后做消费者构建。本文后面只报告 react-img-view 自己由 CI 重复测量的入口体积。

## Headless + 可组合：一个库，三种用法

这是 react-img-view 最核心的设计理念：**行为和呈现彻底分离**。手势引擎、状态机、动画系统全部在 `src/core/` 中，不依赖 React，靠回放指针事件序列做单元测试。React 绑定和默认界面在上面另起一层。

这意味着你可以用三种方式使用它，从一行代码到完全自定义，共享同一套底层实现：

```tsx
import { ImageView, type ImageItem } from 'react-img-view'
import * as Primitives from 'react-img-view/primitives'
import zhCN from 'react-img-view/locales/zh-CN'
import 'react-img-view/styles.css'

const files: ImageItem[] = [
  { src: '/invoice-1048.jpg', alt: '采购单 1048', width: 1600, height: 2200 },
]

// 第一层：单张图片，一行接入
export function SingleAttachment() {
  const file = files[0]!
  return (
    <ImageView {...file} labels={zhCN}>
      <img src="/invoice-1048-thumb.jpg" alt={file.alt} />
    </ImageView>
  )
}

// 第二层：多图共享查看器，使用默认界面
export function SharedViewer() {
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

// 第三层：从 primitives 入口完全自己拼界面
export function CustomViewer() {
  return (
    <Primitives.Root images={files} labels={zhCN}>
      <Primitives.Content>
        <Primitives.Header>
          <Primitives.Close>关闭</Primitives.Close>
          <Primitives.Title />
        </Primitives.Header>
        <Primitives.Stage>
          <Primitives.Image />
          <Primitives.Toolbar>
            <Primitives.ZoomIn>放大</Primitives.ZoomIn>
            <Primitives.ActualSize>1:1</Primitives.ActualSize>
          </Primitives.Toolbar>
        </Primitives.Stage>
      </Primitives.Content>
    </Primitives.Root>
  )
}
```

主入口的 `Root` 只负责一层很薄的组装：检查直接子节点里有没有已经写好的
`<Content>`，有就什么都不补，没有就补上默认界面。真正管理状态、手势与语义的
headless `Root` 位于 `react-img-view/primitives`，它从不依赖默认 UI。第一层和
第二层背后仍然是第三层的同一批部件，但自定义界面不必再把 preset 和图标带进包里。

这种设计带来的好处是实实在在的：

- **零迁移成本升级**：从一行用法到完全定制，不需要换库、不需要重写
- **真正的按需定制**：只替换你不满意的部分，其余保持默认
- **单一维护路径**：不存在「简单模式」和「完整模式」两份容易走样的实现

## 默认行为：为文档查阅场景调优

在默认行为的选择上，react-img-view 做了一些和「刷图」类组件不同的决定：

**工具栏始终可见。** 缩放、旋转、适应窗口、1:1——这些操作是任务的一部分，不应该用一次就消失。

**有一个独立的 1:1 按钮。** 「这张图在原始分辨率下是不是看得清」是文档查阅场景的高频需求。

**下滑关闭只认触摸和触控笔。** 在桌面端，向下拖拽在其它任何地方都不是「关闭」的意思。鼠标拖拽永远不会误关预览。

**双指缩放到边缘会直接接力翻到下一张。** 放大后继续往一个方向拖，图片理应「翻页」而不是死死顶在边界上——这是同一个手势流，只是中途换了谁来接管这段位移。

这些默认行为可以通过组合自由调整。不需要某个行为？不渲染对应的部件就行。

## 手势引擎：状态机驱动，可测试

react-img-view 的手势系统不是一个长长的 `onTouchMove` 回调，而是一个**纯函数状态机**：

```
idle → tracking → panning / paging / dismissing / pinching
```

每个指针事件（down / move / up / cancel）作为输入，经过 `reduce` 函数产生新的状态和一组命令（`settle`、`flingPan`、`page`、`dismiss`…）。这个设计有几个好处：

1. **可单元测试**：不需要浏览器、不需要真实触摸，回放合成事件序列就能验证每种手势路径
2. **行为可预测**：状态转换是确定性的，不会出现「有时候灵有时候不灵」的玄学问题
3. **参数集中调优**：拖拽多远才翻页、快速滑动的衰减力度、触控板双指缩放速率——所有手感相关的常量集中在 [`tuning.ts`](https://github.com/baron04/react-img-view/blob/main/src/core/tuning.ts) 一个文件里，每个数值都有注释说明它在跟什么做取舍

动画系统同样讲究。弹簧动画的积分步长被限制在 1/240 秒以内——因为显式积分的 stiff spring 在步长过大时会发散（测试中图片曾飞到 38000px 宽）。退出动画的弹簧刚度（3600）远高于进入动画（340），因为「离场」必须干脆利落，任何拖沓都会让人觉得卡。

## 复用你的元素，而不是再包一层

控件和布局区域支持 Radix 风格的 `asChild`；`Trigger` 更直接，它始终复用唯一的子元素，不需要也不接收 `asChild`：

```tsx
<ImageView.Trigger src={file.src} alt={file.alt}>
  <MyDesignSystemCard image={file}>
    <img src={file.thumb} alt={file.alt} />
  </MyDesignSystemCard>
</ImageView.Trigger>
```

库贡献行为和 `data-*` 状态属性，不限制你使用什么元素。`Trigger` 可以复用 `next/image`、`<picture>`、设计系统的 Card 组件——它只负责把点击、键盘和焦点管理做好。自定义 React 组件需要转发 `ref` 并把收到的 props 铺到真实 DOM 元素上。

状态通过 `data-*` 属性暴露在外：`data-image-view-trigger`、`data-disabled`、`data-closing`… 你可以用 CSS 选择器精确控制任何状态下的样式，不需要依赖 JS 条件渲染。

## 两种拿到界面的方式

headless 组件的一个常见争议是「到底该给多少默认样式」。react-img-view 给了两条路：

- **CSS 预设**（`react-img-view/styles.css`）：自定义属性写在 `:root` 上，哪种技术栈都能用
- **shadcn registry 区块**：Tailwind 写的源码，装进项目后就是可以直接改的代码——和 shadcn 自己那些组件对 Radix 的处理方式一样，行为留在依赖里，呈现层复制进你的仓库

两条路背后是同一套设计 token，只是分别编码成了 CSS 自定义属性和 Tailwind 的任意值。选哪个应该是使用者的自由，而不是库替他们做决定。

## 体积与依赖

以下数据由仓库的消费者构建脚本测量，口径为当前版本、排除 React、minify 后 gzip；CSS 单独计算：

- 完整 JS 入口约 **11.3 kB**（gzip 后）
- headless primitives 入口约 **10.1 kB**（gzip 后）
- 压缩后的 CSS preset 约 **1.7 kB**（gzip 后）
- 除 React 外**零运行时依赖**
- 支持 React 18 和 19
- TypeScript 编写，完整类型导出
- 支持 SSR；默认文案固定，服务端与 hydration 不会因为浏览器语言产生差异

## 无障碍不是事后补丁

界面文案基本都只以 `aria-label` 的形式存在——默认 UI 渲染的是图标，唯一的可见文字是错误标题。这意味着硬编码语言不只是美观问题，而是**无障碍 bug**：屏幕阅读器会照字面念出这些标签。

默认使用稳定的英文文案，语言由应用显式决定。简体中文可以从
`react-img-view/locales/zh-CN` 按需引入，再通过 `labels` prop 传入；它不会进入
默认 bundle。所有文案集中在 [`ViewerLabels`](https://github.com/baron04/react-img-view/blob/main/src/types.ts)
接口中，扩展新语言只需要实现这个接口。

## 写在最后

react-img-view 不是要做适合所有人的图片查看器。它只想把一件事做好：在文档和附件审阅场景里，提供可靠的手势与语义，同时把界面的最终决定权留给应用。

```bash
npm install react-img-view
```

- [GitHub](https://github.com/baron04/react-img-view)
- [文档](https://baron04.github.io/react-img-view/zh/)
- MIT 协议
