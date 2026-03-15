import { useRef, type ReactNode } from "react";
import { FloatingPanel as FloatingPanelComponent } from "./floating-panel";
import { Box } from "./box";
import { StorySection } from "./storybook";
import { Button } from "./button";
import { Text } from "./text";
import { CopyIcon } from "@webstudio-is/icons";

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

export const LeftDefault = () => (
  <StorySection title="Left (default)">
    <Container>
      <FloatingPanelComponent
        open
        title="Left (default)"
        content={<Text>Content</Text>}
      >
        <Button>Open on the left</Button>
      </FloatingPanelComponent>
    </Container>
  </StorySection>
);

export const RightStart = () => (
  <StorySection title="Right start">
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
  </StorySection>
);

export const BottomWithin = () => (
  <StorySection title="Bottom within">
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
  </StorySection>
);

export const Center = () => (
  <StorySection title="Center">
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
  </StorySection>
);

export const CustomOffsetAndSize = () => (
  <StorySection title="Custom offset and size">
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
  </StorySection>
);

export const WithTitleSuffix = () => (
  <StorySection title="With title suffix">
    <Container>
      <FloatingPanelComponent
        open
        title="With suffix"
        titleSuffix={<Button color="ghost" prefix={<CopyIcon />} />}
        content={<Text>Panel with a custom title suffix button</Text>}
      >
        <Button>Open with title suffix</Button>
      </FloatingPanelComponent>
    </Container>
  </StorySection>
);

export const PersistentPanel = () => (
  <StorySection title="Persistent panel">
    <Container>
      <FloatingPanelComponent
        open
        title="Persistent"
        closeOnInteractOutside={false}
        content={<Text>This panel stays open when clicking outside</Text>}
      >
        <Button>Open persistent</Button>
      </FloatingPanelComponent>
    </Container>
  </StorySection>
);
