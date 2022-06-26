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
export const numericGestureControl = (
  targetNode,
  { initialValue = 0, direction = "horizontal", onValueChange = ({}) => null }
) => {
  const { ownerDocument } = targetNode;
  const eventNames = ["pointerup", "pointerdown", "pointermove"];
  const state = {
    value: initialValue,
    cursor: cursorNode.cloneNode(true),
    offset: 0,
    velocity: direction === "horizontal" ? 1 : -1,
    position: direction === "horizontal" ? "left" : "top",
    rotation: direction === "horizontal" ? "rotate(0deg)" : "rotate(90deg)",
    direction: direction === "horizontal" ? "ew-resize" : "ns-resize",
    dropShadow: `drop-shadow(${
      direction === "horizontal" ? "0 1px" : "1px 0"
    } 1.1px rgba(0,0,0,.4))`,
  };
  const handleEvent = ({
    type,
    target,
    offsetX,
    offsetY,
    movementY,
    movementX,
    pressure,
  }) => {
    const offset = direction === "horizontal" ? offsetX : offsetY;
    const movement = direction === "horizontal" ? movementX : -movementY;
    switch (type) {
      case "pointerup": {
        ownerDocument.exitPointerLock();
        break;
      }
      case "pointerdown": {
        const handlePointerLockEvent = (event) => {
          const { pointerLockElement } = ownerDocument;
          switch (ownerDocument.pointerLockElement) {
            case targetNode: {
              state.offset = offset;
              state.cursor.style.position = "absolute";
              state.cursor.style.top = `${offsetY}px`;
              state.cursor.style.left = `${offsetX}px`;
              state.cursor.style.transform = state.rotation;
              state.cursor.style.setProperty("--drop-shadow", state.dropShadow);
              ownerDocument.documentElement.append(state.cursor);
              break;
            }
            case null: {
              ownerDocument.removeEventListener(
                "pointerlockchange",
                handlePointerLockEvent
              );
              state.cursor.remove();
              break;
            }
          }
        };
        ownerDocument.addEventListener(
          "pointerlockchange",
          handlePointerLockEvent
        );
        targetNode.requestPointerLock();
        break;
      }
      case "pointermove": {
        if (pressure) {
          if (state.offset < 0) state.offset = globalThis.innerWidth + 1;
          else if (state.offset > globalThis.innerWidth) state.offset = 1;
          state.value += movement;
          state.offset += movement * state.velocity;
          state.cursor.style[state.position] = `${state.offset}px`;
          onValueChange({
            target,
            value: state.value,
            preventDefault: () => event.preventDefault(),
          });
        }
        break;
      }
    }
  };
  targetNode.style.setProperty("cursor", state.direction);
  eventNames.forEach((eventName) =>
    targetNode.addEventListener(eventName, handleEvent)
  );
  return {
    disconnectedCallback: () => {
      targetNode.style.removeProperty("cursor");
      eventNames.forEach((eventName) =>
        targetNode.removeEventListener(eventName, handleEvent)
      );
    },
  };
};

const cursorNode = new Range().createContextualFragment(`
  <svg version="1.1" xmlns="http://www.w3.org/2000/svg" width="46" height="15" style="filter:var(--drop-shadow);">
    <g transform="translate(2 3)">
      <path d="M 15 4.5L 15 2L 11.5 5.5L 15 9L 15 6.5L 31 6.5L 31 9L 34.5 5.5L 31 2L 31 4.5Z" fill="#111" fill-rule="evenodd" stroke="#FFF" stroke-width="2"></path>
      <path d="M 15 4.5L 15 2L 11.5 5.5L 15 9L 15 6.5L 31 6.5L 31 9L 34.5 5.5L 31 2L 31 4.5Z" fill="#111" fill-rule="evenodd"></path>
    </g>
  </svg>
`).firstElementChild;
