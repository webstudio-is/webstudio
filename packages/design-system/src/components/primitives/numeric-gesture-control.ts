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
  variants: {
    direction: {
      horizontal: {
        cursor: "ew-resize!important",
        "*": {
          cursor: "ew-resize!important",
        },
      },
      vertical: {
        cursor: "ns-resize!important",
        "*": {
          cursor: "ns-resize!important",
        },
      },
    },
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
  onAbort?: () => void;
  onStatusChange?: (status: "idle" | "scrubbing") => void;
  shouldHandleEvent?: (node: Node) => boolean;
};

type NumericScrubState = {
  value: number;
  cursor?: SVGElement;
  direction: NumericScrubDirection;
  status: "idle" | "scrubbing";
  /**
   * On Windows, requestPointerLock might already be called,
   * but document.pointerLockElement may not have been updated yet.
   */
  pointerCaptureRequested: boolean;
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

const scrubTimeout = 150;

const addScrubUi = () => {
  const className = scrubUI();
  const timerId = setTimeout(() => {
    // Fixes Safari hovers during scrubbing
    window.document.documentElement.setAttribute("inert", "true");
  }, scrubTimeout);

  window.document.documentElement.classList.add(className);

  return () => {
    clearTimeout(timerId);
    window.document.documentElement.classList.remove(className);
    window.document.documentElement.removeAttribute("inert");
  };
};

const addCursorUI = (direction: NumericScrubDirection) => {
  const cursorClassNames = cursorUI({ direction }).toString().split(" ");

  const timerId = setTimeout(() => {
    for (const cursorClassName of cursorClassNames) {
      window.document.documentElement.classList.add(cursorClassName);
    }
  }, scrubTimeout);

  return () => {
    for (const cursorClassName of cursorClassNames) {
      window.document.documentElement.classList.remove(cursorClassName);
    }
    clearTimeout(timerId);
  };
};

const isWindows = () => {
  if (typeof window !== "undefined") {
    return navigator.platform.toLowerCase().includes("win");
  }

  return false;
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
    onAbort,
    onStatusChange,
    shouldHandleEvent,
  } = options;

  const cleanupTasks: Array<() => void> = [];
  const disposeOnCleanup = (fn: () => () => void) => cleanupTasks.push(fn());

  const state: NumericScrubState = {
    // We will read value lazyly in a moment it will be used to avoid having outdated value
    value: -1,
    cursor: undefined,
    direction,
    status: "idle",
    pointerCaptureRequested: false,
  };

  // The appearance of the custom cursor is delayed, so we need to track the mouse position
  // for its initial placement.
  const mouseState = {
    x: 0,
    y: 0,
  };

  const cleanup = () => {
    for (const task of [...cleanupTasks.reverse()]) {
      task();
    }

    cleanupTasks.length = 0;

    if (state.status === "scrubbing") {
      state.status = "idle";
      onStatusChange?.("idle");
    }
  };

  let disposeCursorUI: () => void | undefined;

  // Called on ESC key press or in cases of third-party pointer lock exit.
  const handlePointerLockChange = () => {
    if (document.pointerLockElement !== targetNode) {
      // Reset the value to the initial value
      cleanup();
      onAbort?.();
      return;
    }

    disposeCursorUI?.();
  };

  // Cannot define `event:` as PointerEvent,
  // because (HTMLElement | SVGElement).addEventListener("pointermove", ...)
  // takes (Event => void) as a callback
  const handleEvent = (event: Event) => {
    // For TypeScript
    if (!(event instanceof PointerEvent)) {
      return;
    }

    const { type } = event;

    switch (type) {
      case "pointerup": {
        const shouldComponentUpdate = state.status === "scrubbing";

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
        cleanup();

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

        mouseState.x = event.clientX;
        mouseState.y = event.clientY;

        onStart?.();
        state.value = getInitialValue();

        disposeOnCleanup(() =>
          requestPointerLock(state, mouseState, event, targetNode)
        );
        disposeOnCleanup(() => addScrubUi());

        disposeCursorUI = addCursorUI(options.direction ?? "horizontal");
        disposeOnCleanup(() => disposeCursorUI);

        disposeOnCleanup(() => {
          const abortController = new AbortController();
          const eventOptions = {
            signal: abortController.signal,
          };

          targetNode.addEventListener("pointermove", handleEvent, eventOptions);

          document.addEventListener(
            "pointerlockchange",
            handlePointerLockChange,
            eventOptions
          );

          targetNode.addEventListener(
            "click",
            (event) => {
              // Prevent the click event from firing during scrubbing
              // Resolves issues with margin scrubbing and opening inputs after scrubbing
              // Fixes unintended click events triggered during canvas resizing
              if (state.status === "scrubbing") {
                event.preventDefault();
                event.stopImmediatePropagation();
              }
            },
            eventOptions
          );

          return () => {
            abortController.abort();
          };
        });

        // Pointer event will stop firing on touch after ~300ms because browser starts scrolling the page.
        // restoreUserSelect = setRootStyle(targetNode, "user-select", "none");
        // In chrome mobile touch simulation, you will get the context menu because tapping and holding
        // results in a right click.
        disposeOnCleanup(preventContextMenu);
        break;
      }
      case "pointermove": {
        const { movementY, movementX } = event;

        const movement = direction === "horizontal" ? movementX : -movementY;

        // console.log("movement", movement, event);
        mouseState.x = event.clientX;
        mouseState.y = event.clientY;

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
            Number.parseFloat(state.cursor.style.top) + movementY,
            0,
            globalThis.innerHeight
          );
          const left = wrapAround(
            Number.parseFloat(state.cursor.style.left) + movementX,
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
        cleanup();
        break;
      }

      case "lostpointercapture": {
        // On Mac if this happens it's near 100% probability that pointerup event will not fire
        if (isWindows()) {
          // This Windows fix cause other bug, in some cases pointerup event will not fire
          if (state.pointerCaptureRequested) {
            break;
          }
        }

        if (document.pointerLockElement === null) {
          cleanup();
        }
        break;
      }
    }
  };

  const abortController = new AbortController();
  const eventOptions = { signal: abortController.signal };

  const eventNames = [
    "pointerup",
    "pointerdown",
    "pointercancel",
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

const requestPointerLockSafe = async (targetNode: HTMLElement | SVGElement) => {
  try {
    return await targetNode.requestPointerLock({
      unadjustedMovement: true,
    });
  } catch {
    // Some platforms may not support unadjusted movement.
    return await targetNode.requestPointerLock();
  }
};

const requestPointerLock = (
  state: NumericScrubState,
  mouseState: { x: number; y: number },
  event: PointerEvent,
  targetNode: HTMLElement | SVGElement
) => {
  const cleanupTasks: Array<() => void> = [];
  const disposeOnCleanup = (fn: () => () => void) => cleanupTasks.push(fn());

  const { pointerId } = event;

  // Fixes an issue where setPointerCapture disrupts the input cursor if the input has a selection.
  // To reproduce: click into the input and observe that everything is selected.
  // Then click again and notice the cursor is not placed correctly.
  window.getSelection()?.removeAllRanges();

  disposeOnCleanup(() => {
    targetNode.setPointerCapture(pointerId);
    return () => {
      if (targetNode.hasPointerCapture(pointerId)) {
        targetNode.releasePointerCapture(pointerId);
      }
    };
  });

  let isDisposed = false;
  disposeOnCleanup(() => () => {
    isDisposed = true;
  });

  const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);

  // Safari supports pointer lock well, but the issue lies with the pointer lock banner.
  // It shifts the entire page down, which creates a poor user experience.
  if (!isSafari) {
    disposeOnCleanup(() => {
      const timerId = window.setTimeout(() => {
        state.pointerCaptureRequested = true;
        requestPointerLockSafe(targetNode)
          .then(() => {
            state.pointerCaptureRequested = false;

            if (isDisposed) {
              if (targetNode.ownerDocument.pointerLockElement === targetNode) {
                targetNode.ownerDocument.exitPointerLock();
              }
              return;
            }

            const cursorNode =
              (targetNode.ownerDocument.querySelector(
                "#numeric-guesture-control-cursor"
              ) as SVGElement) ||
              (new DOMParser().parseFromString(
                `
              <svg id="numeric-guesture-control-cursor" version="1.1" xmlns="http://www.w3.org/2000/svg" width="46" height="15">
               <g transform="translate(2 3)">
                 <path d="M 15 4.5L 15 2L 11.5 5.5L 15 9L 15 6.5L 31 6.5L 31 9L 34.5 5.5L 31 2L 31 4.5Z" fill="#111" fill-rule="evenodd" stroke="#FFF" stroke-width="2"></path>
                  <path d="M 15 4.5L 15 2L 11.5 5.5L 15 9L 15 6.5L 31 6.5L 31 9L 34.5 5.5L 31 2L 31 4.5Z" fill="#111" fill-rule="evenodd"></path>
                </g>
              </svg>`,
                "application/xml"
              ).documentElement as Element as SVGElement);

            cursorNode.style.filter = `drop-shadow(${
              state.direction === "horizontal" ? "0 1px" : "1px 0"
            } 1.1px rgba(0,0,0,.4))`;
            cursorNode.style.position = "fixed";
            cursorNode.style.zIndex = Number.MAX_SAFE_INTEGER.toString();

            cursorNode.style.left = `${mouseState.x}px`;
            cursorNode.style.top = `${mouseState.y}px`;

            cursorNode.style.transform = `translate(-50%, -50%) ${
              state.direction === "horizontal"
                ? "rotate(0deg)"
                : "rotate(90deg)"
            }`;
            state.cursor = cursorNode;
            if (state.cursor) {
              targetNode.ownerDocument.documentElement.appendChild(
                state.cursor
              );
            }
          })
          .catch((error) => {
            state.pointerCaptureRequested = false;
            console.error("requestPointerLock", error);
          });
      }, scrubTimeout);

      return () => {
        state.pointerCaptureRequested = false;

        if (state.cursor) {
          state.cursor.remove();
          state.cursor = undefined;
        }

        if (targetNode.ownerDocument.pointerLockElement === targetNode) {
          targetNode.ownerDocument.exitPointerLock();
        }

        clearTimeout(timerId);
      };
    });
  }

  return () => {
    for (const task of [...cleanupTasks.reverse()]) {
      task();
    }
  };
};

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
