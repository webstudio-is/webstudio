## Terminology

- drop target - item accepting draggable element for drop
- drag item - item that has originally received a pointerdown event
- drop index - specific index at which item is going to drop relative to children
- drop target outline - frame that outlines a drop target
- placement indicator - a line that shows where the item is going to be placed
- edge detection - when pointer is near (~5px) an edge of a drop target

## Principles

- You can drop anywhere. At any point in time, there is a drop target and an index that would define the best possible position based on the current pointer position. There will never be an error state. If the best possible position is the original position, so be it.
- At any point in time, we can calculate the drop target outline, rect and placement indicator rect.

## Architecture

We provide two main React hooks: `useDrag` and `useDrop`, and secondary helpers:

- `useAutoScroll` scrolls a scroll container when the pointer nears its edge,
- `useDragCursor` sets `cursor:grabbing` globally during the drag,
- `useHold` detects when a piece of data stays the same for a given amount of time.

### `useDrag`

This hook tracks a “drag” pointer interaction. It tells you:

- when a drag starts,
- on which element,
- when pointer is moved during the drag,
- when the drag has ended.

### `useDrop`

This hook chooses the drop target. You give it the pointer coordinates received from `useDrag`, and it does its best to find the best position among potential drop targets. As a result, you get:

- drop target element,
- coordinates of its bounding rect (drop target outline),
- index within children of the drop target (drop index),
- coordinates of the placement indicator line.

This division of responsibilities between the two hooks allows to put them in different windows. For example, `useDrag` can be instantiated in the main browser window, while `useDrop` can live in an iframe. The information you’ll need to pass between them can be transferred via `postMessage()`.

| Needs access to: | Drop targets DOM | Drag items DOM | Scroll container |
| ---------------- | ---------------- | -------------- | ---------------- |
| `useDrag`        |                  | V              |                  |
| `useDrop`        | V                |                | V                |
| `useAutoScroll`  |                  |                | V                |
| `useHold`        |                  |                |                  |
| `useDragCursor`  |                  |                |                  |
