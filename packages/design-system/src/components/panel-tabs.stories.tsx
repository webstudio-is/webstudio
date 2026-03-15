import { StoryGrid, StorySection } from "./storybook";
import {
  PanelTabs as PanelTabsComponent,
  PanelTabsList,
  PanelTabsTrigger,
  PanelTabsContent,
} from "./panel-tabs";
import { Box } from "./box";
import { Text } from "./text";
import { theme } from "../stitches.config";

export default {
  title: "Panel Tabs",
};

const Wrap = ({ children }: { children: React.ReactNode }) => (
  <div style={{ width: 240, border: "dashed 3px #e3e3e3" }}>{children}</div>
);

const Content = ({ children }: { children: React.ReactNode }) => (
  <Box css={{ padding: theme.spacing[5] }}>
    <Text>{children}</Text>
  </Box>
);

export const PanelTabs = () => (
  <>
    <StorySection title="Three tabs">
      <StoryGrid>
        <Wrap>
          <PanelTabsComponent defaultValue="1">
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
          </PanelTabsComponent>
        </Wrap>
      </StoryGrid>
    </StorySection>

    <StorySection title="Disabled tab">
      <StoryGrid>
        <Wrap>
          <PanelTabsComponent defaultValue="1">
            <PanelTabsList>
              <PanelTabsTrigger value="1">Active</PanelTabsTrigger>
              <PanelTabsTrigger value="2" disabled>
                Disabled
              </PanelTabsTrigger>
              <PanelTabsTrigger value="3">Enabled</PanelTabsTrigger>
            </PanelTabsList>
            <PanelTabsContent value="1">
              <Content>Active tab content</Content>
            </PanelTabsContent>
            <PanelTabsContent value="3">
              <Content>Third tab content</Content>
            </PanelTabsContent>
          </PanelTabsComponent>
        </Wrap>
      </StoryGrid>
    </StorySection>

    <StorySection title="Two tabs">
      <StoryGrid>
        <Wrap>
          <PanelTabsComponent defaultValue="a">
            <PanelTabsList>
              <PanelTabsTrigger value="a">Design</PanelTabsTrigger>
              <PanelTabsTrigger value="b">Settings</PanelTabsTrigger>
            </PanelTabsList>
            <PanelTabsContent value="a">
              <Content>Design content</Content>
            </PanelTabsContent>
            <PanelTabsContent value="b">
              <Content>Settings content</Content>
            </PanelTabsContent>
          </PanelTabsComponent>
        </Wrap>
      </StoryGrid>
    </StorySection>

    <StorySection title="Many tabs">
      <StoryGrid>
        <Wrap>
          <PanelTabsComponent defaultValue="1">
            <PanelTabsList>
              {Array.from({ length: 6 }, (_, i) => (
                <PanelTabsTrigger key={i} value={String(i + 1)}>
                  Tab {i + 1}
                </PanelTabsTrigger>
              ))}
            </PanelTabsList>
            {Array.from({ length: 6 }, (_, i) => (
              <PanelTabsContent key={i} value={String(i + 1)}>
                <Content>Content {i + 1}</Content>
              </PanelTabsContent>
            ))}
          </PanelTabsComponent>
        </Wrap>
      </StoryGrid>
    </StorySection>
  </>
);
