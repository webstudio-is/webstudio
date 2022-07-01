/**
 * @description
 * - detects pointer movements in the specified direction
 * - avails an appropriate cursor
 * - dispatches {onValueChange} method while pointermove and pointerdown are active
 * - dispatched {onValueChange} recieves a new value: old value + accumulation of the pointer move axis
 * @example
 * numericGestureControl(document.querySelector('input'), {
 *   onValueChange: (event) => {
 *     event.preventDefault();
 *     event.target.value = event.value;
 *     event.target.select();
 *   }
 * });
 */

export type Direction = "horizontal" | "vertical";

export type Value = number;

type Options = {
  initialValue: Value;
  direction: Direction;
  onValueChange: (event: {
    target: HTMLInputElement;
    value: Value;
    preventDefault: () => void;
  }) => void;
};

type State = {
  value: number;
  cursor: SVGElement | null;
  offset: number;
  velocity: number;
  direction: string;
};

export const numericGestureControl = (
  targetNode: HTMLInputElement,
  {
    initialValue = 0,
    direction = "horizontal",
    onValueChange = () => null,
  }: Options
) => {
  const eventNames = ["pointerup", "pointerdown", "pointermove"] as const;
  const state: State = {
    value: initialValue,
    cursor: null,
    offset: 0,
    velocity: direction === "horizontal" ? 1 : -1,
    direction: direction,
  };
  const handleCursor = (
    targetNode: HTMLElement | HTMLInputElement,
    shouldSetCursor: boolean
  ) => {
    if (shouldSetCursor) {
      targetNode.style.setProperty(
        "cursor",
        direction === "horizontal" ? "ew-resize" : "ns-resize"
      );
    } else {
      targetNode.style.removeProperty("cursor");
    }
  };
  const handleEvent = (event: PointerEvent) => {
    const { type, offsetX, offsetY, movementY, movementX } = event;
    const offset = direction === "horizontal" ? offsetX : offsetY;
    const movement = direction === "horizontal" ? movementX : -movementY;
    switch (type) {
      case "pointerup": {
        state.offset = 0;
        handleCursor(targetNode.ownerDocument.documentElement, false);
        exitPointerLock(state, event, targetNode);
        break;
      }
      case "pointerdown": {
        state.offset = offset;
        handleCursor(targetNode.ownerDocument.documentElement, true);
        requestPointerLock(state, event, targetNode);
        break;
      }
      case "pointermove": {
        if (state.offset) {
          if (state.offset < 0) state.offset = globalThis.innerWidth + 1;
          else if (state.offset > globalThis.innerWidth) state.offset = 1;
          state.value += movement;
          state.offset += movement * state.velocity;
          onValueChange({
            target: targetNode,
            value: state.value,
            preventDefault: () => event.preventDefault(),
          });
        }
        break;
      }
    }
  };

  handleCursor(targetNode, true);
  eventNames.forEach((eventName) =>
    targetNode.addEventListener(eventName, handleEvent)
  );
  return {
    disconnectedCallback: () => {
      handleCursor(targetNode, false);
      eventNames.forEach((eventName) =>
        targetNode.removeEventListener(eventName, handleEvent)
      );
    },
  };
};

const requestPointerLock = (
  state: State,
  event: PointerEvent,
  targetNode: HTMLElement
) => {
  targetNode.setPointerCapture(event.pointerId);

  if (shouldUsePointerLock()) {
    targetNode.requestPointerLock();
    const cursorNode = new Range().createContextualFragment(`
      <svg version="1.1" xmlns="http://www.w3.org/2000/svg" width="46" height="15" style="filter:var(--drop-shadow);">
       <g transform="translate(2 3)">
         <path d="M 15 4.5L 15 2L 11.5 5.5L 15 9L 15 6.5L 31 6.5L 31 9L 34.5 5.5L 31 2L 31 4.5Z" fill="#111" fill-rule="evenodd" stroke="#FFF" stroke-width="2"></path>
          <path d="M 15 4.5L 15 2L 11.5 5.5L 15 9L 15 6.5L 31 6.5L 31 9L 34.5 5.5L 31 2L 31 4.5Z" fill="#111" fill-rule="evenodd"></path>
        </g>
      </svg>`).firstElementChild as SVGElement;
    cursorNode.style.position = "absolute";
    cursorNode.style.left = `${event.offsetX}px`;
    cursorNode.style.top = `${event.offsetY}px`;
    cursorNode.style.transform =
      state.direction === "horizontal" ? "rotate(0deg)" : "rotate(90deg)";
    cursorNode.style.setProperty(
      "--drop-shadow",
      `drop-shadow(${
        state.direction === "horizontal" ? "0 1px" : "1px 0"
      } 1.1px rgba(0,0,0,.4))`
    );
    state.cursor = cursorNode;
    targetNode.ownerDocument.documentElement.append(state.cursor as Node);
    targetNode.onpointermove = () => {
      (state.cursor as SVGElement).style[
        state.direction === "horizontal" ? "left" : "top"
      ] = `${state.offset}px`;
    };
  }
};

const exitPointerLock = (
  state: State,
  event: PointerEvent,
  targetNode: HTMLElement
) => {
  targetNode.releasePointerCapture(event.pointerId);

  if (shouldUsePointerLock()) {
    (state.cursor as SVGElement).remove();
    targetNode.onpointermove = null;
    targetNode.ownerDocument.exitPointerLock();
  }
};

const shouldUsePointerLock = () => {
  return "chrome" in globalThis;
};
