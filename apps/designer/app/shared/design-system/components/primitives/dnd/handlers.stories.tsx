import { getEnvelopeEndpointWithUrlEncodedAuth } from "@sentry/core";
import { ComponentStory, ComponentMeta } from "@storybook/react";
import { useState } from "react";
import { DropTarget } from "react-dnd";
import { Box } from "../../box";
import { useDrag, useDropTargetRect } from "./handlers";

export const Playground = () => {
  const [dropTargetRect, setDropTargetRect] = useState<DOMRect>();

  const { ref, handleMove } = useDropTargetRect({
    isDropTarget(element: HTMLElement) {
      return element.dataset.draggable === "true";
    },
    onDropTargetChange({ rect, area }: DOMRect) {
      setDropTargetRect(rect);
      console.log("area", area);
    },
  });

  const dragProps = useDrag({
    onStart(event: any) {
      if (event.target.dataset.draggable === "false") {
        event.cancel();
      }
    },
    onMove: handleMove,
  });

  return (
    <div {...dragProps} ref={ref}>
      <Item background="$cyanA9" />
      <Item background="$slateA9" />
      <Item background="$blueA9" draggable={false}>
        Not Draggable
      </Item>
      <Outline rect={dropTargetRect} />
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

const Outline = ({ rect }: { rect?: DOMRect }) => {
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
