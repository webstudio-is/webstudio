import { ComponentStory, ComponentMeta } from "@storybook/react";
import { useEffect, useRef, useState } from "react";
import { Box } from "../../box";
import { useDropTarget, type Area } from "./use-drop-target";
import { useDrag } from "./use-drag";
import { getPlacement, PlacementIndicator, type Rect } from "./placement";

export const Playground = () => {
  const [dropTargetRect, setDropTargetRect] = useState<Rect>();
  const [placementIndicatorRect, setPlacementIndicatorRect] = useState<Rect>();
  const holdRef = useRef<HTMLElement>();
  const dragItemRef = useRef<HTMLElement>();

  const handleHoldEnd = () => {
    holdRef.current?.style.removeProperty("background");
  };

  const { rootRef, handleMove, handleEnd } = useDropTarget({
    isDropTarget(element: HTMLElement) {
      return element.dataset.draggable === "true";
    },
    onDropTargetChange({
      rect,
      area,
      target,
    }: {
      rect: Rect;
      area: Area;
      target: HTMLElement;
    }) {
      setDropTargetRect(rect);
      const placementRect = getPlacement({ target });
      setPlacementIndicatorRect(placementRect);
      console.log("area", area);
    },
    onHold({ target }: { target: HTMLElement }) {
      handleHoldEnd();
      holdRef.current = target;
      target.style.background = "red";
    },
  });

  const dragProps = useDrag({
    onStart(event: any) {
      if (event.target.dataset.draggable === "false") {
        event.cancel();
        return;
      }
      dragItemRef.current = event.target;
    },
    onMove: handleMove,
    onEnd() {
      handleEnd();
      setDropTargetRect(undefined);
      setPlacementIndicatorRect(undefined);
      handleHoldEnd();
    },
    onShiftChange({ shifts, target }: any) {
      console.log("shifts", shifts);
      if (dragItemRef.current) {
        dragItemRef.current.textContent = `shifted ${shifts}`;
      }
    },
  });

  return (
    <Box {...dragProps} ref={rootRef} css={{ display: "flex" }}>
      <Item background="$cyanA9" />
      <Item background="$slateA9" />
      <Item background="$blueA9" draggable={false}>
        Not Draggable
      </Item>
      <Outline rect={dropTargetRect} />
      <PlacementIndicator rect={placementIndicatorRect} />
    </Box>
  );
};

export default {} as ComponentMeta<typeof Playground>;

const Item = ({ background, draggable = true, children }: any) => (
  <Box
    css={{ height: 100, width: 100, background, margin: 10 }}
    data-draggable={draggable}
  >
    {children}
  </Box>
);

const Outline = ({ rect }: { rect?: Rect }) => {
  if (rect === undefined) return null;
  const style = {
    top: rect.top,
    left: rect.left,
    width: rect.width,
    height: rect.height,
  };
  return (
    <Box
      style={style}
      css={{
        position: "absolute",
        pointerEvents: "none",
        outline: "1px solid red",
        outlineOffset: -1,
      }}
    />
  );
};
