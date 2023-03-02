import { useRef } from "react";
import { useStore } from "@nanostores/react";
import type { Publish } from "~/shared/pubsub";
import {
  DeprecatedText2,
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
  Card,
  DeprecatedParagraph,
  Box,
  Flex,
  EnhancedTooltipProvider,
} from "@webstudio-is/design-system";
import { StylePanel } from "~/builder/features/style-panel";
import { PropsPanelContainer } from "~/builder/features/props-panel";
import { FloatingPanelProvider } from "~/builder/shared/floating-panel";
import { theme } from "@webstudio-is/design-system";
import { selectedInstanceStore } from "~/shared/nano-states";
import { SettingsPanel } from "../settings-panel";

type InspectorProps = {
  publish: Publish;
};

const contentStyle = {
  display: "flex",
  flexDirection: "column",
  overflow: "auto",
};

export const Inspector = ({ publish }: InspectorProps) => {
  const selectedInstance = useStore(selectedInstanceStore);
  const tabsRef = useRef<HTMLDivElement>(null);

  if (selectedInstance === undefined) {
    return (
      <Box css={{ p: theme.spacing[5], flexBasis: "100%" }}>
        {/* @todo: use this space for something more usefull: a-la figma's no instance selected sate, maybe create an issue with a more specific proposal? */}
        <Card
          css={{ p: theme.spacing[9], mt: theme.spacing[9], width: "100%" }}
        >
          <DeprecatedParagraph>
            Select an instance on the canvas
          </DeprecatedParagraph>
        </Card>
      </Box>
    );
  }

  return (
    <EnhancedTooltipProvider
      delayDuration={1600}
      disableHoverableContent={false}
      skipDelayDuration={0}
    >
      <FloatingPanelProvider container={tabsRef}>
        <Flex as={Tabs} defaultValue="style" grow ref={tabsRef}>
          <TabsList>
            <TabsTrigger value="style">
              <DeprecatedText2>Style</DeprecatedText2>
            </TabsTrigger>
            {/* @note: events would be part of props */}
            <TabsTrigger value="props">
              <DeprecatedText2>Properties</DeprecatedText2>
            </TabsTrigger>
            <TabsTrigger value="settings">
              <DeprecatedText2>Settings</DeprecatedText2>
            </TabsTrigger>
          </TabsList>
          <TabsContent value="style" css={contentStyle}>
            <StylePanel publish={publish} selectedInstance={selectedInstance} />
          </TabsContent>
          <TabsContent value="props" css={contentStyle}>
            <PropsPanelContainer
              publish={publish}
              key={selectedInstance.id /* Re-render when instance changes */}
              selectedInstance={selectedInstance}
            />
          </TabsContent>
          <TabsContent value="settings" css={contentStyle}>
            <SettingsPanel />
          </TabsContent>
        </Flex>
      </FloatingPanelProvider>
    </EnhancedTooltipProvider>
  );
};
