import { getEnvelopeEndpointWithUrlEncodedAuth } from "@sentry/core";
import { ComponentStory, ComponentMeta } from "@storybook/react";
import { useState } from "react";
import { DropTarget } from "react-dnd";
import { Box } from "../../box";
import { useDrag } from "./handlers";

export const Playground = () => {
  const [dropTarget, setDropTarget] = useState<HTMLElement>();

  const dragProps = useDrag({
    onStart(event: any) {
      if (event.target.dataset.draggable === "false") {
        event.cancel();
      }
    },
    isDropTarget(element: HTMLElement) {
      return element.dataset.draggable === "true";
    },
    onDropTargetChange(element: HTMLElement) {
      setDropTarget(element);
    },
  });

  return (
    <div {...dragProps}>
      <Item background="$cyanA9" />
      <Item background="$slateA9" />
      <Item background="$blueA9" draggable={false}>
        Not Draggable
      </Item>
      <Outline element={dropTarget} />
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

const Outline = ({ element }: { element?: HTMLElement }) => {
  if (element === undefined) return null;
  const rect = element.getBoundingClientRect();
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
