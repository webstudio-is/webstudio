import { getEnvelopeEndpointWithUrlEncodedAuth } from "@sentry/core";
import { ComponentStory, ComponentMeta } from "@storybook/react";
import { Box } from "../../box";
import { useDrag } from "./handlers";

export const Playground = () => {
  const dragProps = useDrag({
    onStart(event: any) {
      if (event.element.dataset.draggable === "false") {
        event.cancel();
      }
      //console.log(event.element, event.element.dataset.draggable);
    },
  });

  return (
    <div {...dragProps}>
      <Item background="$cyanA9" />
      <Item background="$slateA9" />
      <Item background="$blueA9" draggable={false}>
        Not Draggable
      </Item>
    </div>
  );
};

export default {} as ComponentMeta<typeof Playground>;

const Item = ({ background, draggable, children }: any) => (
  <Box
    css={{ width: 100, height: 100, background, margin: 10 }}
    data-draggable={draggable}
  >
    {children}
  </Box>
);
