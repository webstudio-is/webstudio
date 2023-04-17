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
  target: HTMLElement | SVGElement;
  value: NumericScrubValue;
  preventDefault: () => void;
}) => void;

export type NumericScrubOptions = {
  inverse?: boolean;
  minValue?: NumericScrubValue;
  maxValue?: NumericScrubValue;
  getInitialValue: () => number | undefined;
  getValue?: (
    state: NumericScrubState,
    movement: number,
    options: NumericScrubOptions
  ) => number;
  direction?: NumericScrubDirection;
  onValueInput?: NumericScrubCallback;
  onValueChange?: NumericScrubCallback;
  onStatusChange?: (status: "idle" | "scrubbing") => void;
  shouldHandleEvent?: (node: Node) => boolean;
};

type NumericScrubState = {
  value: number;
  cursor?: SVGElement;
  direction: string;
  timerId?: ReturnType<typeof window.setTimeout>;
};

const getValueDefault = (
  state: NumericScrubState,
  movement: number,
  {
    minValue = Number.MIN_SAFE_INTEGER,
    maxValue = Number.MAX_SAFE_INTEGER,
  }: NumericScrubOptions
) => {
  const value = state.value + movement;
  if (value < minValue) {
    return minValue;
  }
  if (state.value > maxValue) {
    return maxValue;
  }
  return value;
};

export const numericScrubControl = (
  targetNode: HTMLElement | SVGElement,
  options: NumericScrubOptions
) => {
  const {
    getInitialValue,
    getValue = getValueDefault,
    direction = "horizontal",
    onValueInput,
    onValueChange,
    onStatusChange,
    shouldHandleEvent,
  } = options;
  const eventNames = ["pointerup", "pointerdown"] as const;
  const state: NumericScrubState = {
    // We will read value lazyly in a moment it will be used to avoid having outdated value
    value: -1,
    cursor: undefined,
    direction: direction,
    timerId: undefined,
  };

  let exitPointerLock: (() => void) | undefined = undefined;

  let originalUserSelect = "";

  const cleanup = () => {
    targetNode.removeEventListener("pointermove", handleEvent);
    onStatusChange?.("idle");
    clearTimeout(state.timerId);

    exitPointerLock?.();
    exitPointerLock = undefined;
    if (originalUserSelect) {
      targetNode.ownerDocument.documentElement.style.userSelect =
        originalUserSelect;
    } else {
      targetNode.ownerDocument.documentElement.style.removeProperty(
        "user-select"
      );
    }
  };

  // Cannot define `event:` as PointerEvent,
  // because (HTMLElement | SVGElement).addEventListener("pointermove", ...)
  // takes (Event => void) as a callback
  const handleEvent = (event: Event) => {
    // For TypeScript
    if (!(event instanceof PointerEvent)) {
      return;
    }

    const { type, movementY, movementX } = event;
    const movement = direction === "horizontal" ? movementX : -movementY;

    switch (type) {
      case "pointerup": {
        const shouldComponentUpdate = Boolean(state.cursor);
        cleanup();
        if (shouldComponentUpdate) {
          onValueChange?.({
            target: targetNode,
            value: state.value,
            preventDefault: () => event.preventDefault(),
          });
        }
        break;
      }
      case "pointerdown": {
        if (
          event.target &&
          shouldHandleEvent?.(event.target as Node) === false
        ) {
          return;
        }
        // light touches don't register corresponding pointerup
        if (event.pressure === 0 || event.button !== 0) {
          break;
        }
        const value = getInitialValue();

        // We don't support scrub on non unit values
        // Its highly unlikely that the value here will be undefined, as useScrub tries to not create scrub on non unit values
        // but having that we use lazy getInitialValue() and vanilla js events it's possible.
        if (value === undefined) {
          return;
        }

        state.value = value;

        state.timerId = setTimeout(() => {
          exitPointerLock?.();

          exitPointerLock = requestPointerLock(state, event, targetNode);
        }, 150);

        onStatusChange?.("scrubbing");
        targetNode.addEventListener("pointermove", handleEvent);
        originalUserSelect =
          targetNode.ownerDocument.documentElement.style.userSelect;
        targetNode.ownerDocument.documentElement.style.userSelect = "none";
        break;
      }
      case "pointermove": {
        const nextValue = getValue(state, movement, options);
        if (nextValue === state.value) {
          break;
        }
        state.value = nextValue;
        onValueInput?.({
          target: targetNode,
          value: state.value,
          preventDefault: () => event.preventDefault(),
        });

        if (state.cursor) {
          // When cursor moves out of the browser window
          // we want it to come back from the other side
          const top = wrapAround(
            Number.parseFloat(state.cursor.style.top) + event.movementY,
            0,
            globalThis.innerHeight
          );
          const left = wrapAround(
            Number.parseFloat(state.cursor.style.left) + event.movementX,
            0,
            globalThis.innerWidth
          );

          // We allow movement on both axis to allow user to
          // move cursor away from the value text to not obscure it
          state.cursor.style.top = `${top}px`;
          state.cursor.style.left = `${left}px`;
        }
        break;
      }
    }
  };

  eventNames.forEach((eventName) =>
    targetNode.addEventListener(eventName, handleEvent)
  );

  return () => {
    eventNames.forEach((eventName) =>
      targetNode.removeEventListener(eventName, handleEvent)
    );
    cleanup();
  };
};

const requestPointerLock = (
  state: NumericScrubState,
  event: PointerEvent,
  targetNode: HTMLElement | SVGElement
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
    const cursorNode = (targetNode.ownerDocument.querySelector(
      "#numeric-guesture-control-cursor"
    ) ||
      new Range().createContextualFragment(`
      <svg id="numeric-guesture-control-cursor" version="1.1" xmlns="http://www.w3.org/2000/svg" width="46" height="15">
       <g transform="translate(2 3)">
         <path d="M 15 4.5L 15 2L 11.5 5.5L 15 9L 15 6.5L 31 6.5L 31 9L 34.5 5.5L 31 2L 31 4.5Z" fill="#111" fill-rule="evenodd" stroke="#FFF" stroke-width="2"></path>
          <path d="M 15 4.5L 15 2L 11.5 5.5L 15 9L 15 6.5L 31 6.5L 31 9L 34.5 5.5L 31 2L 31 4.5Z" fill="#111" fill-rule="evenodd"></path>
        </g>
      </svg>`).firstElementChild) as SVGElement;
    cursorNode.style.filter = `drop-shadow(${
      state.direction === "horizontal" ? "0 1px" : "1px 0"
    } 1.1px rgba(0,0,0,.4))`;
    cursorNode.style.position = "absolute";
    cursorNode.style.zIndex = Number.MAX_SAFE_INTEGER.toString();
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

// When the value is outside of the range make it come back to the range from the other side
//   |        | . -> | .      |
// . |        |   -> |      . |
const wrapAround = (value: number, min: number, max: number) => {
  const range = max - min;

  while (value < min) {
    value += range;
  }

  while (value > max) {
    value -= range;
  }

  return value;
};
