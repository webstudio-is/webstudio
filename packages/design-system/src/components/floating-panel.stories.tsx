import { useRef, type ReactNode } from "react";
import { FloatingPanel } from "./floating-panel";
import { Box } from "./box";
import { Button } from "./button";
import { Text } from "./text";
import { Flex } from "./flex";

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

export const FloatingPanel = () => (
  <Flex direction="column" gap="9">
    <Container>
      <FloatingPanel open title="Left (default)" content={<Text>Content</Text>}>
        <Button>Open on the left</Button>
      </FloatingPanel>
    </Container>
    <Container>
      <FloatingPanel
        placement="right-start"
        open
        title="Right"
        content={<Text>Content</Text>}
      >
        <Button>Open on the right</Button>
      </FloatingPanel>
    </Container>
    <Container>
      <FloatingPanel
        placement="bottom-within"
        open
        title="Bottom"
        content={<Text>Content</Text>}
      >
        <Button>Open below</Button>
      </FloatingPanel>
    </Container>
    <Container>
      <FloatingPanel
        placement="center"
        open
        maximizable
        resize="both"
        title="Center"
        content={<Text>Content</Text>}
      >
        <Button>Open screen-centered</Button>
      </FloatingPanel>
    </Container>
    <Container>
      <FloatingPanel
        offset={{ mainAxis: 20, alignmentAxis: -100 }}
        width={200}
        height={300}
        open
        title="Custom Offset & Size"
        content={<Text>Content</Text>}
      >
        <Button>Open with custom offsets</Button>
      </FloatingPanel>
    </Container>
  </Flex>
);
