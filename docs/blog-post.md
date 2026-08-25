# react-img-view: an image viewer for reading documents, not browsing photos

Every React project with a file-upload field eventually needs an image
preview. You reach for one of the popular gallery libraries, and it mostly
works — until someone asks "can I actually read the fine print on this
contract at full resolution," or "why did my mouse drag close the viewer,"
or "why does the toolbar fade away while I'm using it."

Those aren't bugs in those libraries. They're built for browsing — a photo
feed, a product gallery, a slideshow. Reviewing a document attachment is a
different job with different defaults, and retrofitting a gallery component
for it means fighting its opinions the whole way. So we built
[react-img-view](https://github.com/baron04/react-img-view): composable,
headless, and designed from the ground up for the "someone clicks a
thumbnail, needs to actually read the thing, clicks away again" workflow —
admin panels, document review, attachment previews.

![Zoom, rotate, fit, and page through attachments](../media/demo.gif)

## What "built for reading" actually changes

The positioning isn't just marketing copy — it drives real defaults:

- **The toolbar never fades.** A photo viewer hides its chrome so the image
  fills the screen; a document reviewer needs the zoom and rotate controls
  visible the whole time, because they're mid-task, not mid-scroll.
- **There's a dedicated 1:1 control.** "Is this legible at full resolution"
  is a real, frequent question here, not an edge case.
- **Swipe-to-dismiss only responds to touch and pen.** A mouse drag should
  never close the viewer by accident — which sounds obvious until you notice
  how many viewers get it wrong, because they treat all pointer input the
  same way.
- **Pinch-zoom hands off to the next slide mid-gesture.** Drag a zoomed image
  past its edge and it pages, without a stutter at the handoff — the same
  gesture stream just changes which layer owns the movement.

None of these are exotic. They're the kind of detail that's invisible when
it's right and mildly infuriating when it's wrong, and a gallery library
tuned for browsing will get most of them wrong for this job by default.

## The bug that only real pointer events would catch

Partway through building the toolbar, we hit something worth writing down
because of *how* it was found, not just what it was.

The zoom, rotate, fit-to-window, and prev/next controls all live inside the
same `<Stage>` element that handles pinch and pan gestures — they're
anchored to it in the DOM so their positioning stays simple. `Stage`
captures the pointer on `pointerdown` so a drag survives the finger leaving
the element, which is normal and necessary for a gesture surface.

The problem: it captured the pointer for *every* `pointerdown` inside the
stage, including ones that started on a toolbar button. Once the stage holds
pointer capture, the following `pointerup` gets redirected to the stage
instead of the button — and a browser's click-event synthesis needs
`pointerdown` and `pointerup` to resolve to the *same* element. Break that,
and the click event for the button just never fires.

The controls looked completely dead to a mouse or a real touch tap. And
every round of manual testing missed it, because keyboard shortcuts — which
never touch `Stage`'s pointer handling — worked perfectly, and it's natural
to test with whichever input is fastest to hand while iterating.

What actually caught it: writing Playwright end-to-end tests that drive
*real* pointer events (`page.click()`, which does a genuine
mousedown→mouseup→click sequence) instead of the DOM's `.click()` method
(which fires a synthetic click event directly, skipping pointer events
entirely — and would have passed either way). The fix was three lines: if
the pointerdown target is a control, `Stage` steps aside and lets the click
resolve normally.

```tsx
const onPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
  // A control click isn't a gesture — let it through untouched.
  if ((event.target as HTMLElement).closest('[data-image-view-control]')) return
  event.currentTarget.setPointerCapture(event.pointerId)
  // ...
}
```

The lesson generalizes past this one bug: a gesture surface that also hosts
interactive controls needs deliberate handling for "this pointer event
started on a control," and the only test that reliably catches its absence
is one that goes through the real event path a mouse or touchscreen
actually produces — not whatever's most convenient to script.

## Three ways in, one implementation

The API is layered rather than offering a "simple mode" and a "full mode"
as separate implementations:

```tsx
// L1 — one image, one line
<ImageView src={full} alt={name}>
  <img src={thumb} alt={name} />
</ImageView>

// L2 — several images sharing one viewer, default UI
<ImageView.Root images={files}>
  {files.map((f) => (
    <ImageView.Trigger key={f.src} {...f}>
      <img src={f.src} alt={f.alt} />
    </ImageView.Trigger>
  ))}
</ImageView.Root>

// L3 — full composition, your own layout
<ImageView.Root images={files}>
  <ImageView.Content>
    <ImageView.Header>…</ImageView.Header>
    <ImageView.Stage><ImageView.Image /></ImageView.Stage>
    <ImageView.Toolbar>…</ImageView.Toolbar>
  </ImageView.Content>
</ImageView.Root>
```

`Root` checks whether you've already placed a `<Content>` among its
children and appends the same reviewed default UI itself when you haven't.
There's no separate "simple" implementation to fall out of sync with the
one L3 composes by hand — L1 and L2 are just L3 with nothing extra written.

## Try it

```bash
npm install react-img-view
```

- [GitHub](https://github.com/baron04/react-img-view)
- [Docs](https://baron04.github.io/react-img-view)
- MIT licensed

If a gesture feels off on your device, `src/core/tuning.ts` is the one file
with every constant that controls feel — a PR changing a number there, with
what device it was felt on, is exactly the kind of contribution this needs.
