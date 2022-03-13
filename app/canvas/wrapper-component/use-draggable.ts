import { useCallback, useEffect } from "react";
import { useDrag } from "react-dnd";
import { type Instance } from "@webstudio-is/sdk";
import { type InitialDragData } from "~/shared/component";
import { publish } from "../pubsub";
//import { usePointerOutline } from "~/canvas/hooks";

type UseDraggable = {
  id: Instance["id"];
  component: Instance["component"];
  isDisabled: boolean;
};

export const useDraggable = ({ id, component, isDisabled }: UseDraggable) => {
  //const updatePointerOutline = usePointerOutline();
  const [{ isDragging, currentOffset }, dragRefCallback] = useDrag(
    () => ({
      type: component,
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
      publish<"dragStartComponent">({ type: "dragStartComponent" });
    } else {
      // Ended
      publish<"dragEndInstance", Instance["id"]>({
        type: "dragEndInstance",
        payload: id,
      });
    }
  }, [isDragging, id]);

  useEffect(() => {
    if (currentOffset === null || isDragging === false) return;
    // updatePointerOutline(currentOffset);
    publish<"dragComponent", InitialDragData>({
      type: "dragComponent",
      payload: {
        component,
        currentOffset,
      },
    });
  }, [component, currentOffset, isDragging]);

  const handleMouseDown = useCallback(
    (event) => {
      // We need to disable d&d on parent components
      // to enable text selection when content editable is enabled.
      if (isDisabled) {
        event.stopPropagation();
      }
    },
    [isDisabled, id]
  );

  return { dragRefCallback, onMouseDownCapture: handleMouseDown };
};
