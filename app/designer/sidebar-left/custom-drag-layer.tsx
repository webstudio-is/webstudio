import { useEffect } from "react";
import { createPortal } from "react-dom";
import { useDragLayer, XYCoord } from "react-dnd";
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

const getItemStyles = (
  initialOffset: XYCoord | null,
  currentOffset: XYCoord | null
): { transform?: string; display?: "none" } => {
  if (!initialOffset || !currentOffset) {
    return {
      display: "none",
    };
  }
  let { x, y } = currentOffset;
  const transform = `translate(${x}px, ${y}px)`;
  return {
    transform,
  };
};

export type CustomDragLayerProps = {
  onDrag: (dragData: InitialDragData) => void;
};

export const CustomDragLayer = ({ onDrag }: CustomDragLayerProps) => {
  const { itemType, isDragging, initialOffset, clientOffset } = useDragLayer(
    (monitor) => ({
      item: monitor.getItem(),
      itemType: monitor.getItemType() as Instance["component"],
      initialOffset: monitor.getInitialSourceClientOffset(),
      isDragging: monitor.isDragging(),
      clientOffset: monitor.getClientOffset(),
    })
  );

  useEffect(() => {
    if (clientOffset === null || initialOffset === null || itemType === null) {
      return;
    }

    const currentOffset = {
      x: clientOffset.x - initialOffset.x,
      y: clientOffset.y - initialOffset.y,
    };

    onDrag({
      currentOffset,
      component: itemType,
    });
  }, [clientOffset, initialOffset, itemType]);

  if (isDragging === false) return null;

  return createPortal(
    <div style={layerStyles}>
      {
        //<div style={getItemStyles(initialOffset, currentOffset)}></div>
      }
    </div>,
    document.body
  );
};
