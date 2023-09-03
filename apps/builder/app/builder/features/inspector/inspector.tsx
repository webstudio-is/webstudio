import { useRef, useState } from "react";
import { useStore } from "@nanostores/react";
import type { Instance } from "@webstudio-is/sdk";
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
import { SettingsPanelContainer } from "~/builder/features/settings-panel";
import { FloatingPanelProvider } from "~/builder/shared/floating-panel";
import {
  selectedInstanceStore,
  isDraggingStore,
  registeredComponentMetasStore,
} from "~/shared/nano-states";
import { NavigatorTree } from "~/builder/shared/navigator-tree";
import type { Settings } from "~/builder/shared/client-settings";
import { MetaIcon } from "~/builder/shared/meta-icon";
import { getInstanceLabel } from "~/shared/instance-utils";

const InstanceInfo = ({ instance }: { instance: Instance }) => {
  const metas = useStore(registeredComponentMetasStore);
  const componentMeta = metas.get(instance.component);
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
  const metas = useStore(registeredComponentMetasStore);

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

  const meta = metas.get(selectedInstance.component);
  const isStyleTabVisible = meta?.stylable ?? true;

  const availableTabs = [
    isStyleTabVisible ? "style" : undefined,
    "settings",
  ].filter((tab) => tab);

  return (
    <EnhancedTooltipProvider
      delayDuration={1200}
      disableHoverableContent={false}
      skipDelayDuration={0}
    >
      <FloatingPanelProvider container={tabsRef}>
        <PanelTabs
          ref={tabsRef}
          value={availableTabs.includes(tab) ? tab : availableTabs[0]}
          onValueChange={setTab}
          asChild
        >
          <Flex direction="column">
            <PanelTabsList>
              {isStyleTabVisible && (
                <PanelTabsTrigger value="style">Style</PanelTabsTrigger>
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
            <PanelTabsContent value="settings" css={contentStyle} tabIndex={-1}>
              <ScrollArea>
                <InstanceInfo instance={selectedInstance} />
                <SettingsPanelContainer
                  publish={publish}
                  key={
                    selectedInstance.id /* Re-render when instance changes */
                  }
                  selectedInstance={selectedInstance}
                />
              </ScrollArea>
            </PanelTabsContent>
          </Flex>
        </PanelTabs>
      </FloatingPanelProvider>
    </EnhancedTooltipProvider>
  );
};
