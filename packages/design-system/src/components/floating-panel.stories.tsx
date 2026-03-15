import { useRef, type ReactNode } from "react";
import { FloatingPanel as FloatingPanelComponent } from "./floating-panel";
import { Box } from "./box";
import { Button } from "./button";
import { Text } from "./text";
import { Flex } from "./flex";

export default {
  title: "Floating Panel",
  component: FloatingPanelComponent,
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
      <FloatingPanelComponent
        open
        title="Left (default)"
        content={<Text>Content</Text>}
      >
        <Button>Open on the left</Button>
      </FloatingPanelComponent>
    </Container>
    <Container>
      <FloatingPanelComponent
        placement="right-start"
        open
        title="Right"
        content={<Text>Content</Text>}
      >
        <Button>Open on the right</Button>
      </FloatingPanelComponent>
    </Container>
    <Container>
      <FloatingPanelComponent
        placement="bottom-within"
        open
        title="Bottom"
        content={<Text>Content</Text>}
      >
        <Button>Open below</Button>
      </FloatingPanelComponent>
    </Container>
    <Container>
      <FloatingPanelComponent
        placement="center"
        open
        maximizable
        resize="both"
        title="Center"
        content={<Text>Content</Text>}
      >
        <Button>Open screen-centered</Button>
      </FloatingPanelComponent>
    </Container>
    <Container>
      <FloatingPanelComponent
        offset={{ mainAxis: 20, alignmentAxis: -100 }}
        width={200}
        height={300}
        open
        title="Custom Offset & Size"
        content={<Text>Content</Text>}
      >
        <Button>Open with custom offsets</Button>
      </FloatingPanelComponent>
    </Container>
  </Flex>
);
