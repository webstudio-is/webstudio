import { useEffect } from "react";
import { createPortal } from "react-dom";
import { useDragLayer, type XYCoord } from "react-dnd";
import { type Instance } from "@webstudio-is/sdk";
import { useCanvasRect, useZoom } from "~/designer/shared/nano-values";

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
  onDrag: (dragData: {
    component: Instance["component"];
    currentOffset: XYCoord;
  }) => void;
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
  const [canvasRect] = useCanvasRect();
  const [zoom] = useZoom();

  useEffect(() => {
    if (
      clientOffset === null ||
      initialOffset === null ||
      component === null ||
      canvasRect === undefined
    ) {
      return;
    }

    const scale = zoom / 100;
    const currentOffset = {
      x: (clientOffset.x - canvasRect.x) / scale,
      y: (clientOffset.y - canvasRect.y) / scale,
    };

    onDrag({
      currentOffset,
      component,
    });
  }, [clientOffset, initialOffset, component, onDrag, zoom, canvasRect]);

  if (isDragging === false) return null;

  return createPortal(<div style={layerStyles} />, document.body);
};
