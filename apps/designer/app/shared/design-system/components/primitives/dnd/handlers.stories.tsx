import { ComponentStory, ComponentMeta } from "@storybook/react";
import { useEffect, useRef, useState } from "react";
import { Box } from "../../box";
import { useDropTarget, type Area } from "./use-drop-target";
import { useDrag } from "./use-drag";

type Rect = Pick<DOMRect, "top" | "left" | "width" | "height">;

export const Playground = () => {
  const [dropTargetRect, setDropTargetRect] = useState<Rect>();
  const [placementIndicatorRect, setPlacementIndicatorRect] = useState<Rect>();
  const holdRef = useRef<HTMLElement>();

  const handleHoldEnd = () => {
    holdRef.current?.style.removeProperty("background");
  };

  const { rootRef, handleMove } = useDropTarget({
    isDropTarget(element: HTMLElement) {
      return element.dataset.draggable === "true";
    },
    onDropTargetChange({ rect, area }: { rect: Rect; area: Area }) {
      setDropTargetRect(rect);
      setPlacementIndicatorRect({
        top: rect.top,
        left: rect.left,
        width: rect.width,
        height: 2,
      });
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
      }
    },
    onMove: handleMove,
    onEnd() {
      setDropTargetRect(undefined);
      setPlacementIndicatorRect(undefined);
      handleHoldEnd();
    },
  });

  return (
    <div {...dragProps} ref={rootRef}>
      <Item background="$cyanA9" />
      <Item background="$slateA9" />
      <Item background="$blueA9" draggable={false}>
        Not Draggable
      </Item>
      <Outline rect={dropTargetRect} />
      <PlacementIndicator rect={placementIndicatorRect} />
    </div>
  );
};

export default {} as ComponentMeta<typeof Playground>;

const Item = ({ background, draggable = true, children }: any) => (
  <Box
    css={{ width: 100, height: 100, background, margin: 10 }}
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

const PlacementIndicator = ({ rect }: { rect?: Rect }) => {
  if (rect === undefined) return null;
  const style = {
    top: rect.top,
    left: rect.left,
    width: rect.width,
    height: rect.height,
  };
  return (
    <Box style={style} css={{ position: "absolute", background: "green" }} />
  );
};
