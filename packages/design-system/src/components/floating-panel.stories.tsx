import { useRef, type ReactNode } from "react";
import { FloatingPanel } from "./floating-panel";
import { Box } from "./box";
import { Button } from "./button";
import { Text } from "./text";

export default {
  title: "Floating Panel",
  component: FloatingPanel,
};

const Container = ({ children }: { children: ReactNode }) => {
  const ref = useRef(null);
  return (
    <Box
      ref={ref}
      data-floating-panel-container
      css={{
        display: "inline-block",
        marginLeft: 300,
        padding: 100,
        border: `1px solid black`,
      }}
    >
      {children}
    </Box>
  );
};

export const Left = () => {
  return (
    <Container>
      <FloatingPanel open title="Title" content={<Text>Content</Text>}>
        <Button>Open on the left</Button>
      </FloatingPanel>
    </Container>
  );
};

export const Right = () => {
  return (
    <Container>
      <FloatingPanel
        placement="right-start"
        open
        title="Title"
        content={<Text>Content</Text>}
      >
        <Button>Open on the right</Button>
      </FloatingPanel>
    </Container>
  );
};

export const Bottom = () => {
  return (
    <Container>
      <FloatingPanel
        placement="bottom-within"
        open
        title="Title"
        content={<Text>Content</Text>}
      >
        <Button>Open below</Button>
      </FloatingPanel>
    </Container>
  );
};

export const Center = () => {
  return (
    <Container>
      <FloatingPanel
        placement="center"
        open
        maximizable
        resize="both"
        title="Title"
        content={<Text>Content</Text>}
      >
        <Button>Open screen-centered</Button>
      </FloatingPanel>
    </Container>
  );
};

export const CustomOffsetAndSize = () => {
  return (
    <Container>
      <FloatingPanel
        offset={{ mainAxis: 20, alignmentAxis: -100 }}
        width={200}
        height={300}
        open
        title="Title"
        content={<Text>Content</Text>}
      >
        <Button>Open with custom offsets</Button>
      </FloatingPanel>
    </Container>
  );
};
