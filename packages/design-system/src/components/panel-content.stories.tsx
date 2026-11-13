import type { ReactNode } from "react";
import { Box } from "./box";
import { Flex } from "./flex";
import { Grid } from "./grid";
import { PanelContent } from "./panel-content";
import { Separator } from "./separator";
import { StoryGrid, StorySection } from "./storybook";
import { Text } from "./text";
import { cssVar } from "../css-var";

export default {
  title: "Panel content",
};

const PanelFrame = ({ children }: { children: ReactNode }) => (
  <Box
    css={{
      width: 320,
      border: `1px solid ${cssVar("--border-default")}`,
    }}
  >
    {children}
  </Box>
);

export const ContentSections = () => (
  <StorySection title="Content sections">
    <StoryGrid horizontal>
      <PanelFrame>
        <PanelContent>
          <Text variant="titles">Default content</Text>
        </PanelContent>
        <Separator />
        <PanelContent as={Grid} gap={2}>
          <Text variant="labels">Grid content</Text>
          <Text color="subtle">
            Content uses the standard panel inset while the separator reaches
            both edges.
          </Text>
        </PanelContent>
        <Separator />
        <PanelContent as={Flex} justify="between">
          <Text>Left</Text>
          <Text>Right</Text>
        </PanelContent>
      </PanelFrame>
    </StoryGrid>
  </StorySection>
);
