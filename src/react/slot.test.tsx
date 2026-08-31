import * as React from 'react'
import { describe, expect, it, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { Slot, composeRefs } from './slot'

/**
 * `Slot` is what makes `asChild` work, so it is what every custom control in
 * the documentation ultimately rests on. It is also where the failure mode the
 * customization page warns about lives: a child that drops props it does not
 * recognise silently swallows the click handler, the ref and the `data-*`
 * state, and nothing throws.
 */
describe('Slot', () => {
  it('renders the child element rather than a wrapper of its own', () => {
    const { container } = render(
      <Slot data-testid="slotted">
        <a href="/somewhere">go</a>
      </Slot>,
    )

    expect(container.firstElementChild?.tagName).toBe('A')
    expect(screen.getByTestId('slotted').getAttribute('href')).toBe('/somewhere')
  })

  it('renders nothing when there is no element to render into', () => {
    const { container } = render(<Slot data-x="1">{'just text'}</Slot>)
    expect(container.firstChild).toBeNull()
  })

  it('runs the child handler before its own', () => {
    const order: string[] = []
    render(
      <Slot onClick={() => order.push('slot')}>
        <button onClick={() => order.push('child')}>go</button>
      </Slot>,
    )

    fireEvent.click(screen.getByText('go'))
    // Child first is what lets a consumer preventDefault before the library
    // acts on the same event.
    expect(order).toEqual(['child', 'slot'])
  })

  it('lets the child cancel the slot handler with preventDefault', () => {
    const slotHandler = vi.fn()
    render(
      <Slot onClick={slotHandler}>
        <button onClick={(e) => e.preventDefault()}>go</button>
      </Slot>,
    )

    fireEvent.click(screen.getByText('go'))
    expect(slotHandler).not.toHaveBeenCalled()
  })

  it('keeps a handler that only one side supplies', () => {
    const slotOnly = vi.fn()
    const childOnly = vi.fn()
    render(
      <Slot onClick={slotOnly}>
        <button onFocus={childOnly}>go</button>
      </Slot>,
    )

    const button = screen.getByText('go')
    fireEvent.click(button)
    fireEvent.focus(button)
    expect(slotOnly).toHaveBeenCalled()
    expect(childOnly).toHaveBeenCalled()
  })

  it('merges className and style instead of replacing them', () => {
    render(
      <Slot className="from-slot" style={{ color: 'red', margin: '1px' }}>
        <button className="from-child" style={{ color: 'blue' }}>
          go
        </button>
      </Slot>,
    )

    const button = screen.getByText('go')
    expect(button.className.split(' ').sort()).toEqual(['from-child', 'from-slot'])
    // The child wins the collision; the slot still contributes what it alone set.
    expect(button.style.color).toBe('blue')
    expect(button.style.margin).toBe('1px')
  })

  it('gives the slot the last word on everything else', () => {
    render(
      <Slot data-state="open" aria-label="from slot">
        <button data-state="closed" aria-label="from child">
          go
        </button>
      </Slot>,
    )

    // State the library publishes has to win, or `data-active` styling would
    // depend on whether the consumer happened to set the attribute too.
    const button = screen.getByText('go')
    expect(button.getAttribute('data-state')).toBe('open')
    expect(button.getAttribute('aria-label')).toBe('from slot')
  })

  it('reaches both the slot ref and the child ref', () => {
    const slotRef = React.createRef<HTMLElement>()
    const childRef = React.createRef<HTMLButtonElement>()

    render(
      <Slot ref={slotRef}>
        <button ref={childRef}>go</button>
      </Slot>,
    )

    // The FLIP animation measures from the library's ref; losing the
    // consumer's would break their own code instead.
    expect(slotRef.current).toBe(screen.getByText('go'))
    expect(childRef.current).toBe(screen.getByText('go'))
  })
})

describe('composeRefs', () => {
  it('fills callback refs and object refs alike, and tolerates gaps', () => {
    const object = React.createRef<string>()
    const callback = vi.fn()
    const node = 'node'

    composeRefs<string>(object, undefined, callback)(node)

    expect(object.current).toBe(node)
    expect(callback).toHaveBeenCalledWith(node)
  })
})
