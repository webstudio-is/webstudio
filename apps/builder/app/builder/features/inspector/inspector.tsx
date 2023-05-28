import { useRef, useState } from "react";
import { useStore } from "@nanostores/react";
import type { Instance } from "@webstudio-is/project-build";
import { getComponentMeta } from "@webstudio-is/react-sdk";
import {
  theme,
  PanelTabs,
  PanelTabsList,
  PanelTabsTrigger,
  PanelTabsContent,
  Card,
  Text,
  Box,
  EnhancedTooltipProvider,
  Flex,
  ScrollArea,
} from "@webstudio-is/design-system";
import type { Publish } from "~/shared/pubsub";
import { StylePanel } from "~/builder/features/style-panel";
import { PropsPanelContainer } from "~/builder/features/props-panel";
import { FloatingPanelProvider } from "~/builder/shared/floating-panel";
import { selectedInstanceStore, isDraggingStore } from "~/shared/nano-states";
import { SettingsPanel } from "../settings-panel";
import { NavigatorTree } from "~/builder/shared/navigator-tree";
import type { Settings } from "~/builder/shared/client-settings";
import { MetaIcon } from "~/builder/shared/meta-icon";
import { getInstanceLabel } from "~/builder/shared/tree";

const InstanceInfo = ({ instance }: { instance: Instance }) => {
  const componentMeta = getComponentMeta(instance.component);
  if (componentMeta === undefined) {
    return null;
  }
  const label = getInstanceLabel(instance, componentMeta);
  return (
    <Flex
      shrink="false"
      gap="1"
      align="center"
      css={{
        px: theme.spacing[9],
        height: theme.spacing[13],
        color: theme.colors.foregroundSubtle,
      }}
    >
      <MetaIcon icon={componentMeta.icon} />
      <Text truncate variant="labelsSentenceCase">
        {label}
      </Text>
    </Flex>
  );
};

type InspectorProps = {
  publish: Publish;
  navigatorLayout: Settings["navigatorLayout"];
};

const contentStyle = {
  display: "flex",
  flexDirection: "column",
  overflow: "auto",
};

export const Inspector = ({ publish, navigatorLayout }: InspectorProps) => {
  const selectedInstance = useStore(selectedInstanceStore);
  const tabsRef = useRef<HTMLDivElement>(null);
  const [tab, setTab] = useState("style");
  const isDragging = useStore(isDraggingStore);

  if (navigatorLayout === "docked" && isDragging) {
    return <NavigatorTree />;
  }

  if (selectedInstance === undefined) {
    return (
      <Box css={{ p: theme.spacing[5], flexBasis: "100%" }}>
        {/* @todo: use this space for something more usefull: a-la figma's no instance selected sate, maybe create an issue with a more specific proposal? */}
        <Card
          css={{ p: theme.spacing[9], mt: theme.spacing[9], width: "100%" }}
        >
          <Text>Select an instance on the canvas</Text>
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
        <PanelTabs
          ref={tabsRef}
          value={selectedInstance?.component === "Slot" ? "settings" : tab}
          onValueChange={setTab}
          asChild
        >
          <Flex direction="column">
            <PanelTabsList>
              {selectedInstance.component !== "Slot" && (
                <>
                  <PanelTabsTrigger value="style">Style</PanelTabsTrigger>
                  {/* @note: events would be part of props */}
                  <PanelTabsTrigger value="props">Properties</PanelTabsTrigger>
                </>
              )}
              <PanelTabsTrigger value="settings">Settings</PanelTabsTrigger>
            </PanelTabsList>
            <PanelTabsContent value="style" css={contentStyle} tabIndex={-1}>
              <InstanceInfo instance={selectedInstance} />
              <StylePanel
                publish={publish}
                selectedInstance={selectedInstance}
              />
            </PanelTabsContent>
            <PanelTabsContent value="props" css={contentStyle} tabIndex={-1}>
              <ScrollArea>
                <InstanceInfo instance={selectedInstance} />
                <PropsPanelContainer
                  publish={publish}
                  key={
                    selectedInstance.id /* Re-render when instance changes */
                  }
                  selectedInstance={selectedInstance}
                />
              </ScrollArea>
            </PanelTabsContent>
            <PanelTabsContent value="settings" css={contentStyle} tabIndex={-1}>
              <ScrollArea>
                <InstanceInfo instance={selectedInstance} />
                <SettingsPanel />
              </ScrollArea>
            </PanelTabsContent>
          </Flex>
        </PanelTabs>
      </FloatingPanelProvider>
    </EnhancedTooltipProvider>
  );
};
