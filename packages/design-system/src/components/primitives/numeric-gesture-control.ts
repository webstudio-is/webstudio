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

import { clamp } from "@react-aria/utils";
import { css } from "../../stitches.config";

const scrubUI = css({
  "*": {
    userSelect: "none!important",
    touchAction: "none!important",
  },
});

const cursorUI = css({
  "*": {
    cursor: "ew-resize!important",
  },
});

export type NumericScrubDirection = "horizontal" | "vertical";

export type NumericScrubValue = number;

export type NumericScrubEvent = {
  type: "scrubend" | "scrubbing";
  target: HTMLElement | SVGElement;
  value: NumericScrubValue;
  preventDefault: () => void;
};

type NumericScrubCallback = (event: NumericScrubEvent) => void;

export type NumericScrubOptions = {
  inverse?: boolean;
  getAcceleration?: () => number | undefined;
  minValue?: NumericScrubValue;
  maxValue?: NumericScrubValue;
  distanceThreshold?: number;
  getInitialValue: () => number;
  onStart?: () => void;
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
  direction: NumericScrubDirection;
  timerId?: ReturnType<typeof window.setTimeout>;
  status: "idle" | "scrubbing";
};

const getValueDefault = (
  state: NumericScrubState,
  movement: number,
  {
    minValue = Number.MIN_SAFE_INTEGER,
    maxValue = Number.MAX_SAFE_INTEGER,
    getAcceleration = () => 1,
  }: NumericScrubOptions
) => {
  // toFixed is needed to fix `1.3 - 1 = 0.30000000000000004`
  const acceleration = getAcceleration() ?? 1;
  const value = Number((state.value + movement * acceleration).toFixed(2));
  return clamp(value, minValue, maxValue);
};

const preventContextMenu = () => {
  const handler = (event: MouseEvent) => {
    event.preventDefault();
  };
  window.addEventListener("contextmenu", handler);
  return () => {
    window.removeEventListener("contextmenu", handler);
  };
};

const addScrubUi = () => {
  const className = scrubUI();
  const cursorClassName = cursorUI();
  const timerId = setTimeout(() => {
    window.document.documentElement.classList.add(cursorClassName);
  }, 300);

  window.document.documentElement.classList.add(className);

  return () => {
    window.document.documentElement.classList.remove(className);
    clearTimeout(timerId);
    window.document.documentElement.classList.remove(cursorClassName);
  };
};

export const numericScrubControl = (
  targetNode: HTMLElement | SVGElement,
  options: NumericScrubOptions
) => {
  const {
    getInitialValue,
    onStart,
    getValue = getValueDefault,
    direction = "horizontal",
    distanceThreshold = 0,
    onValueInput,
    onValueChange,
    onStatusChange,
    shouldHandleEvent,
  } = options;

  const state: NumericScrubState = {
    // We will read value lazyly in a moment it will be used to avoid having outdated value
    value: -1,
    cursor: undefined,
    direction,
    timerId: undefined,
    status: "idle",
  };

  let exitPointerLock: (() => void) | undefined = undefined;
  let restoreContextMenu: (() => void) | undefined = undefined;
  let restoreUi: (() => void) | undefined = undefined;

  const cleanup = () => {
    targetNode.removeEventListener("pointermove", handleEvent);

    if (state.status === "scrubbing") {
      state.status = "idle";
      onStatusChange?.("idle");
    }

    clearTimeout(state.timerId);
    exitPointerLock?.();
    exitPointerLock = undefined;
    restoreContextMenu?.();
    restoreContextMenu = undefined;
    restoreUi?.();
    restoreUi = undefined;
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
        const shouldComponentUpdate = state.status === "scrubbing";
        console.log("pointerup");

        cleanup();

        if (shouldComponentUpdate) {
          onValueChange?.({
            type: "scrubend",
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

        console.log("pointerdown");

        onStart?.();
        state.value = getInitialValue();
        // state.timerId = setTimeout(async () => {
        exitPointerLock?.();
        exitPointerLock = requestPointerLock(state, event, targetNode);
        // }, 150);

        targetNode.addEventListener("pointermove", handleEvent);
        restoreUi = addScrubUi();

        // Pointer event will stop firing on touch after ~300ms because browser starts scrolling the page.
        // restoreUserSelect = setRootStyle(targetNode, "user-select", "none");
        // In chrome mobile touch simulation, you will get the context menu because tapping and holding
        // results in a right click.
        restoreContextMenu = preventContextMenu();
        break;
      }
      case "pointermove": {
        const nextValue = getValue(state, movement, options);
        if (nextValue === state.value) {
          break;
        }
        state.value = nextValue;

        if (state.status !== "scrubbing") {
          const initialValue = getInitialValue();
          // If the value is not changing enough, we don't want to start scrubbing.
          if (Math.abs(initialValue - nextValue) < distanceThreshold) {
            return;
          }
          // We need to reset the value to the initial so that the actual value starts from the initial value
          // when we start calling onValueInput.
          state.value = initialValue;
          state.status = "scrubbing";
          onStatusChange?.("scrubbing");
        }
        onValueInput?.({
          type: "scrubbing",
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
      case "pointercancel": {
        console.log("pointercancel");
        cleanup();
        break;
      }
      case "gotpointercapture": {
        console.log("gotpointercapture");
        break;
      }
      case "lostpointercapture": {
        console.log("lostpointercapture");
        cleanup();
        break;
      }
    }
  };

  const abortController = new AbortController();
  const eventOptions = { signal: abortController.signal };

  const eventNames = [
    "pointerup",
    "pointerdown",
    "pontercancel",
    "gotpointercapture",
    "lostpointercapture",
  ] as const;
  eventNames.forEach((eventName) =>
    targetNode.addEventListener(eventName, handleEvent, eventOptions)
  );

  // Prevents dragging of the input content
  // Dragging breaks the setPointerCapture
  targetNode.addEventListener(
    "dragstart",
    (event) => {
      event.preventDefault();
    },
    eventOptions
  );

  return () => {
    abortController.abort();
    cleanup();
  };
};

// If the same property was set while its already in a temporal state, something is wrong with
// the logic on call-site and we need to inform the developer.
// const rootStyleTracker = new Map<string, boolean>();

const requestPointerLock = (
  state: NumericScrubState,
  event: PointerEvent,
  targetNode: HTMLElement | SVGElement
) => {
  // After ~0.3 seconds starts touch events as page scrolling.
  // const restoreTouchAction = setRootStyle(targetNode, "touch-action", "none");

  // The pointer lock api nukes the cursor on requestng a pointer lock,
  // creating and managing the visual que of the cursor is thus left to the author
  // we create and append an svg that serves as the visual que of where the cursor currently is
  // taking into account horizontal/vertical orientation of the cursor itself, and update its position on move.
  // we only use pointerLock api on chromium based browsers, because they feature an unobtrusive ux when activating it
  // other browsers show a warning banner, making the use of it in this scenario subpar: in which case we fallback to using non-pointerLock means:
  // albeit without an infinite cursor ux.
  if (shouldUsePointerLock) {
    // based on https://developer.mozilla.org/en-US/docs/Web/API/Element/requestPointerLock is async
    try {
      // unadjustedMovement is a chromium only feature, fixes random movementX|Y jumps on windows
      //await targetNode.requestPointerLock({ unadjustedMovement: true });
    } catch {
      // Some platforms may not support unadjusted movement.
      // await targetNode.requestPointerLock();
    }

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
    cursorNode.style.position = "fixed";
    cursorNode.style.zIndex = Number.MAX_SAFE_INTEGER.toString();
    cursorNode.style.left = `${event.clientX}px`;
    cursorNode.style.top = `${event.clientY}px`;
    cursorNode.style.transform = `translate(-50%, -50%) ${
      state.direction === "horizontal" ? "rotate(0deg)" : "rotate(90deg)"
    }`;
    state.cursor = cursorNode;
    if (state.cursor) {
      targetNode.ownerDocument.documentElement.appendChild(state.cursor);
    }
    return () => {
      if (state.cursor) {
        state.cursor.remove();
        state.cursor = undefined;
      }
      // restoreTouchAction();
      targetNode.ownerDocument.exitPointerLock();
    };
  }

  const { pointerId } = event;
  /*
  const restoreCursor = setRootStyle(
    targetNode,
    "cursor",
    state.direction === "horizontal" ? "ew-resize" : "ns-resize"
  );
  */

  // Fixes an issue where setPointerCapture disrupts the input cursor if the input has a selection.
  // To reproduce: click into the input and observe that everything is selected.
  // Then click again and notice the cursor is not placed correctly.
  window.getSelection()?.removeAllRanges();
  targetNode.setPointerCapture(pointerId);
  console.log("setPointerCapture", targetNode.hasPointerCapture(pointerId));

  return () => {
    // restoreCursor();
    // restoreTouchAction();
    targetNode.releasePointerCapture(pointerId);
  };
};

const shouldUsePointerLock = false; //  "chrome" in globalThis;

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
