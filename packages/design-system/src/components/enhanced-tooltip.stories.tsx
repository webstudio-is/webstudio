import {
  EnhancedTooltip as EnhancedTooltipComponent,
  EnhancedTooltipProvider,
} from "./enhanced-tooltip";
import { Flex } from "./flex";
import { Text } from "./text";
import { InputField } from "./input-field";
import { StorySection } from "./storybook";
import { Button } from "./button";

export default {
  title: "Enhanced Tooltip",
  component: EnhancedTooltipComponent,
};

export const EnhancedTooltip = () => (
  <EnhancedTooltipProvider>
    <StorySection title="Default (open)">
      <Flex css={{ padding: 40 }}>
        <EnhancedTooltipComponent content="Hello world" defaultOpen>
          <InputField />
        </EnhancedTooltipComponent>
      </Flex>
    </StorySection>

    <StorySection title="With JSX content">
      <Flex css={{ padding: 40 }}>
        <EnhancedTooltipComponent
          content={
            <Flex direction="column" gap="1">
              <Text variant="labels">Tooltip title</Text>
              <Text variant="small" color="moreSubtle">
                Additional description text
              </Text>
            </Flex>
          }
          defaultOpen
        >
          <InputField placeholder="Hover me" />
        </EnhancedTooltipComponent>
      </Flex>
    </StorySection>

    <StorySection title="Side placements">
      <Flex gap="6" css={{ padding: 60 }}>
        <EnhancedTooltipComponent content="Top" side="top" defaultOpen>
          <Button>Top</Button>
        </EnhancedTooltipComponent>
        <EnhancedTooltipComponent content="Right" side="right" defaultOpen>
          <Button>Right</Button>
        </EnhancedTooltipComponent>
        <EnhancedTooltipComponent content="Bottom" side="bottom" defaultOpen>
          <Button>Bottom</Button>
        </EnhancedTooltipComponent>
        <EnhancedTooltipComponent content="Left" side="left" defaultOpen>
          <Button>Left</Button>
        </EnhancedTooltipComponent>
      </Flex>
    </StorySection>

    <StorySection title="Custom delay">
      <Flex css={{ padding: 40 }}>
        <EnhancedTooltipComponent
          content="Shows after 500ms"
          delayDuration={500}
        >
          <InputField placeholder="Short delay (500ms)" />
        </EnhancedTooltipComponent>
      </Flex>
    </StorySection>

    <StorySection title="Alignment options">
      <Flex gap="6" css={{ padding: 60 }}>
        <EnhancedTooltipComponent
          content="Aligned start"
          align="start"
          defaultOpen
        >
          <Button>Start</Button>
        </EnhancedTooltipComponent>
        <EnhancedTooltipComponent
          content="Aligned center"
          align="center"
          defaultOpen
        >
          <Button>Center</Button>
        </EnhancedTooltipComponent>
        <EnhancedTooltipComponent content="Aligned end" align="end" defaultOpen>
          <Button>End</Button>
        </EnhancedTooltipComponent>
      </Flex>
    </StorySection>
  </EnhancedTooltipProvider>
);
