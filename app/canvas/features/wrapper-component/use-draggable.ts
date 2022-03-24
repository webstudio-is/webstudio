import { useCallback, useEffect } from "react";
import { useDrag } from "react-dnd";
import { type Instance } from "@webstudio-is/sdk";
import { type DragData } from "~/shared/component";
import { publish } from "../../shared/pubsub";
//import { usePointerOutline } from "~/canvas/hooks";

type UseDraggable = {
  instance: Instance;
  isDisabled: boolean;
};

export const useDraggable = ({ instance, isDisabled }: UseDraggable) => {
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
      // Ended
      publish<"dragEndInstance", Instance["id"]>({ type: "dragEndInstance" });
    }
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
