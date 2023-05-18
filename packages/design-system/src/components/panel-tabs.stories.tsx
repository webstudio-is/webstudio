import { StoryGrid } from "./storybook";
import {
  PanelTabs,
  PanelTabsList,
  PanelTabsTrigger,
  PanelTabsContent,
} from "./panel-tabs";
import { Box } from "./box";
import { Text } from "./text";
import { theme } from "../stitches.config";

export default {
  title: "Library/Panel Tabs",
};

const Wrap = ({ children }: { children: React.ReactNode }) => (
  <div style={{ width: 240, border: "dashed 3px #e3e3e3" }}>{children}</div>
);

const Content = ({ children }: { children: React.ReactNode }) => (
  <Box css={{ padding: theme.spacing[5] }}>
    <Text>{children}</Text>
  </Box>
);

export const Demo = () => (
  <StoryGrid>
    <Wrap>
      <PanelTabs defaultValue="1">
        <PanelTabsList>
          <PanelTabsTrigger value="1">Tab 1</PanelTabsTrigger>
          <PanelTabsTrigger value="2">Tab 2</PanelTabsTrigger>
          <PanelTabsTrigger value="3">Tab 3</PanelTabsTrigger>
        </PanelTabsList>
        <PanelTabsContent value="1">
          <Content>Content 1</Content>
        </PanelTabsContent>
        <PanelTabsContent value="2">
          <Content>Content 2</Content>
        </PanelTabsContent>
        <PanelTabsContent value="3">
          <Content>Content 3</Content>
        </PanelTabsContent>
      </PanelTabs>
    </Wrap>
  </StoryGrid>
);
Demo.storyName = "Panel Tabs";
