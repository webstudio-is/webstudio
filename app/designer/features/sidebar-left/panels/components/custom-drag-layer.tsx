import { useEffect } from "react";
import { createPortal } from "react-dom";
import { useDragLayer, type XYCoord } from "react-dnd";
import { type Instance } from "@webstudio-is/sdk";
import { useCanvasRect, useZoom } from "~/designer/shared/nano-values";
import { ComponentThumb } from "./component-thumb";

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
  const { component, isDragging, clientOffset, sourceClientOffset } =
    useDragLayer((monitor) => ({
      component: monitor.getItemType() as Instance["component"],
      isDragging: monitor.isDragging(),
      clientOffset: monitor.getClientOffset(),
      sourceClientOffset: monitor.getSourceClientOffset(),
    }));
  const [canvasRect] = useCanvasRect();
  const [zoom] = useZoom();

  useEffect(() => {
    if (
      clientOffset === null ||
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
  }, [clientOffset, component, onDrag, zoom, canvasRect]);

  if (isDragging === false || sourceClientOffset === null) return null;

  return createPortal(
    <div style={layerStyles}>
      <ComponentThumb
        component={component}
        style={{
          transform: `translate3d(${sourceClientOffset.x}px, ${sourceClientOffset.y}px, 0)`,
        }}
        state="dragging"
      />
    </div>,
    document.body
  );
};
