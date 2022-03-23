import { useEffect } from "react";
import { createPortal } from "react-dom";
import { useDragLayer } from "react-dnd";
import { type Instance } from "@webstudio-is/sdk";
import type { InitialDragData } from "~/shared/component";

const layerStyles = {
  position: "absolute",
  pointerEvents: "none",
  zIndex: 1,
  left: 0,
  top: 0,
  width: "100%",
  height: "100%",
} as const;

export type CustomDragLayerProps = {
  onDrag: (dragData: InitialDragData) => void;
};

export const CustomDragLayer = ({ onDrag }: CustomDragLayerProps) => {
  const {
    itemType: component,
    isDragging,
    initialOffset,
    clientOffset,
  } = useDragLayer((monitor) => ({
    itemType: monitor.getItemType() as Instance["component"],
    initialOffset: monitor.getInitialSourceClientOffset(),
    isDragging: monitor.isDragging(),
    clientOffset: monitor.getClientOffset(),
  }));

  useEffect(() => {
    if (clientOffset === null || initialOffset === null || component === null) {
      return;
    }

    const currentOffset = {
      x: clientOffset.x - initialOffset.x,
      y: clientOffset.y - initialOffset.y,
    };

    onDrag({
      currentOffset,
      component,
    });
  }, [clientOffset, initialOffset, component, onDrag]);

  if (isDragging === false) return null;

  return createPortal(<div style={layerStyles} />, document.body);
};
