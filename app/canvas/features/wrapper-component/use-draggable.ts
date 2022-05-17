import { useCallback, useEffect, useRef } from "react";
import { useDrag } from "react-dnd";
import { type Instance, publish } from "@webstudio-is/sdk";
import { type DragData } from "~/shared/component";
//import { usePointerOutline } from "~/canvas/hooks";

type UseDraggable = {
  instance: Instance;
  isDisabled: boolean;
};

export const useDraggable = ({ instance, isDisabled }: UseDraggable) => {
  const isDraggingRef = useRef(false);

  //const updatePointerOutline = usePointerOutline();
  const [{ isDragging, currentOffset }, dragRefCallback] = useDrag(
    () => ({
      type: instance.component,
      collect(monitor) {
        return {
          isDragging: monitor.isDragging(),
          currentOffset: monitor.getClientOffset(),
        };
      },
      canDrag() {
        return isDisabled === false;
      },
    }),
    [isDisabled]
  );

  useEffect(() => {
    // Started
    if (isDragging === true) {
      publish<"dragStartInstance">({ type: "dragStartInstance" });
    } else {
      // Initial state is false, don't fire event if there was no dragging
      //if (isDraggingRef.current === false) return;
      // Ended
      publish<"dragEndInstance", Instance["id"]>({ type: "dragEndInstance" });
    }
    isDraggingRef.current = isDragging;
  }, [isDragging, instance.id]);

  useEffect(() => {
    if (currentOffset === null || isDragging === false) return;
    // updatePointerOutline(currentOffset);
    publish<"dragInstance", DragData>({
      type: "dragInstance",
      payload: {
        instance,
        currentOffset,
      },
    });
  }, [instance, currentOffset, isDragging]);

  const handleMouseDown = useCallback(
    (event) => {
      // We need to disable d&d on parent components
      // to enable text selection when content editable is enabled.
      if (isDisabled) {
        event.stopPropagation();
      }
    },
    [isDisabled]
  );

  return { dragRefCallback, onMouseDownCapture: handleMouseDown };
};
