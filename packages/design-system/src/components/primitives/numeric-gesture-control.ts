/**
 * @description
 * - detects pointer movements in the specified direction
 * - avails an appropriate cursor
 * - dispatches {onValueChange} method while pointermove and pointerdown are active
 * - dispatched {onValueChange} recieves a new value: old value + accumulation of the pointer move axis
 * @example
 * numericScrubControl(document.querySelector('input'), {
 *   onValueChange: (event) => {
 *     event.preventDefault();
 *     event.target.value = event.value;
 *     event.target.select();
 *   }
 * });
 */

export type NumericScrubDirection = "horizontal" | "vertical";

export type NumericScrubValue = number;

export type NumericScrubCallback = (event: {
  target: HTMLElement;
  value: NumericScrubValue;
  preventDefault: () => void;
}) => void;

export type NumericScrubOptions = {
  minValue?: NumericScrubValue;
  maxValue?: NumericScrubValue;
  getValue: () => number | undefined;
  direction?: NumericScrubDirection;
  onValueInput?: NumericScrubCallback;
  onValueChange?: NumericScrubCallback;
  shouldHandleEvent?: (node: EventTarget) => boolean;
};

type NumericScrubState = {
  value: number;
  cursor?: SVGElement;
  offset: number;
  velocity: number;
  direction: string;
  timerId?: ReturnType<typeof window.setTimeout>;
};

export const numericScrubControl = (
  targetNode: HTMLElement,
  {
    minValue = Number.MIN_SAFE_INTEGER,
    maxValue = Number.MAX_SAFE_INTEGER,
    getValue,
    direction = "horizontal",
    onValueInput,
    onValueChange,
    shouldHandleEvent,
  }: NumericScrubOptions
) => {
  const eventNames = ["pointerup", "pointerdown"] as const;
  const state: NumericScrubState = {
    // We will read value lazyly in a moment it will be used to avoid having outdated value
    value: -1,
    cursor: undefined,
    offset: 0,
    velocity: direction === "horizontal" ? 1 : -1,
    direction: direction,
    timerId: undefined,
  };

  let exitPointerLock: (() => void) | undefined = undefined;

  const handleEvent = (event: PointerEvent) => {
    const { type, clientX, clientY, movementY, movementX } = event;
    const offset = direction === "horizontal" ? clientX : clientY;
    const movement = direction === "horizontal" ? movementX : -movementY;

    switch (type) {
      case "pointerup": {
        const shouldComponentUpdate = Boolean(state.cursor);
        state.offset = 0;
        targetNode.removeEventListener("pointermove", handleEvent);
        clearTimeout(state.timerId);

        exitPointerLock?.();
        exitPointerLock = undefined;

        if (shouldComponentUpdate)
          onValueChange?.({
            target: targetNode,
            value: state.value,
            preventDefault: () => event.preventDefault(),
          });
        break;
      }
      case "pointerdown": {
        if (event.target && shouldHandleEvent?.(event.target) === false) return;
        // light touches don't register corresponding pointerup
        if (event.pressure === 0 || event.button !== 0) break;
        const value = getValue();

        // We don't support scrub on non unit values
        // Its highly unlikely that the value here will be undefined, as useScrub tries to not create scrub on non unit values
        // but having that we use lazy getValue() and vanilla js events it's possible.
        if (value === undefined) return;

        state.value = value;

        state.offset = offset;
        state.timerId = setTimeout(() => {
          exitPointerLock?.();

          exitPointerLock = requestPointerLock(state, event, targetNode);
        }, 150);

        targetNode.addEventListener("pointermove", handleEvent);
        break;
      }
      case "pointermove": {
        if (state.offset) {
          if (state.offset < 0) state.offset = globalThis.innerWidth + 1;
          else if (state.offset > globalThis.innerWidth) state.offset = 1;

          state.value += movement;

          if (state.value < minValue) state.value = minValue;
          else if (state.value > maxValue) state.value = maxValue;

          state.offset += movement * state.velocity;

          onValueInput?.({
            target: targetNode,
            value: state.value,
            preventDefault: () => event.preventDefault(),
          });
        }
        if (state.cursor) {
          state.cursor.style.top = `${
            parseFloat(state.cursor.style.top) + event.movementY
          }px`;
          state.cursor.style[
            state.direction === "horizontal" ? "left" : "top"
          ] = `${state.offset}px`;
        }
        break;
      }
    }
  };

  eventNames.forEach((eventName) =>
    targetNode.addEventListener(eventName, handleEvent)
  );

  return {
    disconnectedCallback: () => {
      eventNames.forEach((eventName) =>
        targetNode.removeEventListener(eventName, handleEvent)
      );

      clearTimeout(state.timerId);
      targetNode.removeEventListener("pointermove", handleEvent);

      exitPointerLock?.();
      exitPointerLock = undefined;
    },
  };
};

const requestPointerLock = (
  state: NumericScrubState,
  event: PointerEvent,
  targetNode: HTMLElement
) => {
  // The pointer lock api nukes the cursor on requestng a pointer lock,
  // creating and managing the visual que of the cursor is thus left to the author
  // we create and append an svg that serves as the visual que of where the cursor currently is
  // taking into account horizontal/vertical orientation of the cursor itself, and update its position on move.
  // we only use pointerLock api on chromium based browsers, because they feature an unobtrusive ux when activating it
  // other browsers show a warning banner, making the use of it in this scenario subpar: in which case we fallback to using non-pointerLock means:
  // albeit without an infinite cursor ux.
  if (shouldUsePointerLock) {
    targetNode.requestPointerLock();
    const cursorNode = (targetNode.ownerDocument.querySelector("#cursor") ||
      new Range().createContextualFragment(`
      <svg id="cursor" version="1.1" xmlns="http://www.w3.org/2000/svg" width="46" height="15">
       <g transform="translate(2 3)">
         <path d="M 15 4.5L 15 2L 11.5 5.5L 15 9L 15 6.5L 31 6.5L 31 9L 34.5 5.5L 31 2L 31 4.5Z" fill="#111" fill-rule="evenodd" stroke="#FFF" stroke-width="2"></path>
          <path d="M 15 4.5L 15 2L 11.5 5.5L 15 9L 15 6.5L 31 6.5L 31 9L 34.5 5.5L 31 2L 31 4.5Z" fill="#111" fill-rule="evenodd"></path>
        </g>
      </svg>`).firstElementChild) as SVGElement;
    cursorNode.style.filter = `drop-shadow(${
      state.direction === "horizontal" ? "0 1px" : "1px 0"
    } 1.1px rgba(0,0,0,.4))`;
    cursorNode.style.position = "absolute";
    cursorNode.style.left = `${event.clientX}px`;
    cursorNode.style.top = `${event.clientY}px`;
    cursorNode.style.transform = `translate(-50%, -50%) ${
      state.direction === "horizontal" ? "rotate(0deg)" : "rotate(90deg)"
    }`;
    state.cursor = cursorNode;
    if (state.cursor) {
      targetNode.ownerDocument.documentElement.append(state.cursor);
    }
    return () => {
      if (state.cursor) {
        state.cursor.remove();
        state.cursor = undefined;
      }

      targetNode.ownerDocument.exitPointerLock();
    };
  } else {
    const { pointerId } = event;
    targetNode.ownerDocument.documentElement.style.setProperty(
      "cursor",
      state.direction === "horizontal" ? "ew-resize" : "ns-resize"
    );
    targetNode.setPointerCapture(pointerId);

    return () => {
      targetNode.ownerDocument.documentElement.style.removeProperty("cursor");
      targetNode.releasePointerCapture(pointerId);
    };
  }
};

const shouldUsePointerLock = "chrome" in globalThis;
