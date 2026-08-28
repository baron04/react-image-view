# 为什么我重新写了一个 React 图片查看器

React 生态里有图片查看器库，但用过之后你会发现一个共同的问题：**改不动**。想换个配色？得覆盖一堆内部样式。想把工具栏挪个位置？组件没暴露这个接口。想用自己的设计系统组件来渲染触发器？不行，它只接受 `<img>`。想加一个自定义按钮到工具栏里？要么 fork 源码，要么放弃。

具体来看，主流库在定制能力上各有局限：

| 库 | 特点 | 定制痛点 |
|---|---|---|
| **PhotoSwipe** | 老牌全能，功能最全 | 原生 JS 操作 DOM，与 React 理念格格不入；内置样式难以彻底替换；React 包装层由社区维护，质量参差不齐 |
| **react-photo-view** | React 原生，交互动画精致，7KB 轻量 | 支持 `toolbarRender` 自定义工具栏，但整体 UI 结构（遮罩、导航条、图片容器）不可拆分替换；样式通过 CSS 类名控制，深度定制需要覆盖大量选择器 |
| **rc-image**（Ant Design） | 与 Ant Design 生态集成 | 功能最基础；样式和结构与 Ant Design 强绑定，脱离 Ant Design 使用成本高 |
| **yet-another-react-lightbox** | 插件体系丰富，支持自定义 UI | 体积大（核心 + 常用插件 gzip 后 20KB+）；插件扩展功能方便，但整体架构复杂，深度定制需要理解多层抽象 |
| **react-image-lightbox** | 轻量简单 | 已停止维护（GitHub archived）；样式写死在组件内，几乎无法定制 |

它们的共同问题是：**行为和呈现绑在一起**。样式、布局、交互逻辑封装在组件内部，开发者能控制的只有几个 prop 和 render 函数。一旦需求超出了 prop 的覆盖范围——想换个布局、替换某个部件、接入自己的设计系统——就卡住了。

于是有了 [react-img-view](https://github.com/baron04/react-img-view)——一个无样式（headless）、可组合的 React 图片查看器。**行为由库提供，呈现由你决定。**

## Headless + 可组合：一个库，三种用法

这是 react-img-view 最核心的设计理念：**行为和呈现彻底分离**。手势引擎、状态机、动画系统全部在 `src/core/` 中，不依赖 React，靠回放指针事件序列做单元测试。React 绑定和默认界面在上面另起一层。

这意味着你可以用三种方式使用它，从一行代码到完全自定义，共享同一套底层实现：

```tsx
// 第一层：单张图片，一行接入
<ImageView src={full} alt={name}>
  <img src={thumb} alt={name} />
</ImageView>

// 第二层：多图共享查看器，使用默认界面
<ImageView.Root images={files}>
  {files.map((f) => (
    <ImageView.Trigger key={f.src} {...f}>
      <img src={f.src} alt={f.alt} />
    </ImageView.Trigger>
  ))}
</ImageView.Root>

// 第三层：完全自己拼界面
<ImageView.Root images={files}>
  <ImageView.Content>
    <ImageView.Header>…</ImageView.Header>
    <ImageView.Stage><ImageView.Image /></ImageView.Stage>
    <ImageView.Toolbar>…</ImageView.Toolbar>
    <ImageView.Thumbnails />
  </ImageView.Content>
</ImageView.Root>
```

`Root` 只做一件事：检查子节点里有没有已经写好的 `<Content>`，有就什么都不补，没有就补上默认界面。第一层和第二层背后用的就是第三层组合出来的那套部件——**没有另一份「精简版」实现**。默认界面能做的事，手写组合也都能做，因为它们本来就是同一批积木。

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

## 每个部件都支持 `asChild`

react-img-view 借鉴了 Radix UI 的 Slot 机制，每个部件都支持 `asChild` 模式。这意味着你可以用自己的组件来渲染任何部位：

```tsx
<ImageView.Trigger asChild>
  <MyDesignSystemCard image={file}>
    <img src={file.thumb} alt={file.alt} />
  </MyDesignSystemCard>
</ImageView.Trigger>
```

库贡献行为和 `data-*` 状态属性，永远不会 dictate 你用什么元素。`Trigger` 可以包 `next/image`、`<picture>`、设计系统的 Card 组件——它只负责把点击、键盘、焦点管理做好。

状态通过 `data-*` 属性暴露在外：`data-image-view-trigger`、`data-disabled`、`data-closing`… 你可以用 CSS 选择器精确控制任何状态下的样式，不需要依赖 JS 条件渲染。

## 两种拿到界面的方式

无样式组件的一个常见争议是「到底该给多少默认样式」。react-img-view 给了两条路：

- **CSS 预设**（`react-img-view/styles.css`）：自定义属性写在 `:root` 上，哪种技术栈都能用
- **shadcn registry 区块**：Tailwind 写的源码，装进项目后就是可以直接改的代码——和 shadcn 自己那些组件对 Radix 的处理方式一样，行为留在依赖里，呈现层复制进你的仓库

两条路背后是同一套设计 token，只是分别编码成了 CSS 自定义属性和 Tailwind 的任意值。选哪个应该是使用者的自由，而不是库替他们做决定。

## 体积与依赖

- JS 运行时约 **13 kB**（gzip 后）
- 除 React 外**零运行时依赖**
- 支持 React 18 和 19
- TypeScript 编写，完整类型导出
- 支持 SSR（`useSyncExternalStore` 处理了 hydration 的语言匹配问题）

## 无障碍不是事后补丁

界面文案基本都只以 `aria-label` 的形式存在——默认 UI 渲染的是图标，唯一的可见文字是错误标题。这意味着硬编码语言不只是美观问题，而是**无障碍 bug**：屏幕阅读器会照字面念出这些标签。

默认跟随浏览器语言自动切换（内置英语和简体中文），需要固定语言时传一个 `labels` prop 就行。所有文案集中在 [`ViewerLabels`](https://github.com/baron04/react-img-view/blob/main/src/types.ts) 接口中，扩展新语言只需要实现这个接口。

## 写在最后

react-img-view 不是要做「最好的图片查看器」——这个定义取决于你的场景。它要做的是**最好定制的图片查看器**：通过 headless + 可组合的架构，让开发者能够精确控制每一个部件的行为和呈现，而不是在组件的限制里做妥协。

```bash
npm install react-img-view
```

- [GitHub](https://github.com/baron04/react-img-view)
- [文档](https://baron04.github.io/react-img-view/zh/)
- MIT 协议
