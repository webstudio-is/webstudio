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
  const eventNames = ["pointerup", "pointerdown", "pointermove"];
  const state = {
    value: initialValue,
    offset: 0,
    direction: direction === "horizontal" ? "ew-resize" : "ns-resize",
    cursor: cursorNode.cloneNode(true),
  };
  const handleEvent = ({
    type,
    target,
    offsetX,
    offsetY,
    movementY,
    movementX,
    pointerId,
    pressure,
    x,
    y,
  }) => {
    const offset = direction === "horizontal" ? offsetX : offsetY;
    const movement = direction === "horizontal" ? movementX : -movementY;
    const position = direction === "horizontal" ? "left" : "top";
    switch (type) {
      case "pointerup": {
        state.offset = 0;
        targetNode.ownerDocument.exitPointerLock(pointerId);
        state.cursor.remove();
        break;
      }
      case "pointerdown": {
        state.offset = offset;
        state.cursor.style.position = "absolute";
        state.cursor.style.top = `${offsetY}px`;
        state.cursor.style.left = `${offsetX}px`;
        targetNode.requestPointerLock();
        targetNode.ownerDocument.documentElement.append(state.cursor);
        break;
      }
      case "pointermove": {
        if (pressure) {
          if (state.offset < 0) {
            state.offset = globalThis.innerWidth + 1;
          } else if (state.offset > globalThis.innerWidth) {
            state.offset = 1;
          }
          state.value += movement;
          state.offset += movement;
          state.cursor.style[position] = `${state.offset}px`;
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
  <svg version="1.1" xmlns="http://www.w3.org/2000/svg" width="46" height="15">
    <g transform="translate(2 3)">
      <path fill-rule="evenodd" d="M 15 4.5L 15 2L 11.5 5.5L 15 9L 15 6.5L 31 6.5L 31 9L 34.5 5.5L 31 2L 31 4.5Z"></path>
      <path fill-rule="evenodd" d="M 15 4.5L 15 2L 11.5 5.5L 15 9L 15 6.5L 31 6.5L 31 9L 34.5 5.5L 31 2L 31 4.5Z"></path>
    </g>
  </svg>
`).firstElementChild;
