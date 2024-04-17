import { useRef, useState } from "react";
import { computed } from "nanostores";
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
  Separator,
  Tooltip,
} from "@webstudio-is/design-system";
import { StylePanel } from "~/builder/features/style-panel";
import { SettingsPanelContainer } from "~/builder/features/settings-panel";
import { FloatingPanelProvider } from "~/builder/shared/floating-panel";
import {
  $selectedInstance,
  $registeredComponentMetas,
  $dragAndDropState,
  $inspectorLastInputTime,
} from "~/shared/nano-states";
import { NavigatorTree } from "~/builder/shared/navigator-tree";
import type { Settings } from "~/builder/shared/client-settings";
import { MetaIcon } from "~/builder/shared/meta-icon";
import { getInstanceLabel } from "~/shared/instance-utils";
import { BindingPopoverProvider } from "~/builder/shared/binding-popover";

const InstanceInfo = ({ instance }: { instance: Instance }) => {
  const metas = useStore($registeredComponentMetas);
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
        my: theme.spacing[3],
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
  navigatorLayout: Settings["navigatorLayout"];
};

const contentStyle = {
  display: "flex",
  flexDirection: "column",
  overflow: "auto",
};

const $isDragging = computed([$dragAndDropState], (state) => state.isDragging);

const handleInspectorInput = () => {
  // Notify canvas of input changes, related to setInert on iframe
  $inspectorLastInputTime.set(Date.now());
};

export const Inspector = ({ navigatorLayout }: InspectorProps) => {
  const selectedInstance = useStore($selectedInstance);
  const tabsRef = useRef<HTMLDivElement>(null);
  const [tab, setTab] = useState("style");
  const isDragging = useStore($isDragging);
  const metas = useStore($registeredComponentMetas);

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
        <BindingPopoverProvider value={{ containerRef: tabsRef }}>
          <div style={{ display: "contents" }} onInput={handleInspectorInput}>
            <PanelTabs
              ref={tabsRef}
              value={availableTabs.includes(tab) ? tab : availableTabs[0]}
              onValueChange={setTab}
              asChild
            >
              <Flex direction="column">
                <PanelTabsList>
                  {isStyleTabVisible && (
                    <Tooltip
                      variant="wrapped"
                      content="The Style panel allows manipulation of CSS visually."
                    >
                      <div>
                        <PanelTabsTrigger value="style">Style</PanelTabsTrigger>
                      </div>
                    </Tooltip>
                  )}
                  <Tooltip
                    variant="wrapped"
                    content="The Settings panel allows for customizing component properties and HTML attributes."
                  >
                    <div>
                      <PanelTabsTrigger value="settings">
                        Settings
                      </PanelTabsTrigger>
                    </div>
                  </Tooltip>
                </PanelTabsList>
                <Separator />
                <PanelTabsContent
                  value="style"
                  css={contentStyle}
                  tabIndex={-1}
                >
                  <InstanceInfo instance={selectedInstance} />
                  <StylePanel selectedInstance={selectedInstance} />
                </PanelTabsContent>
                <PanelTabsContent
                  value="settings"
                  css={contentStyle}
                  tabIndex={-1}
                >
                  <ScrollArea>
                    <InstanceInfo instance={selectedInstance} />
                    <SettingsPanelContainer
                      key={
                        selectedInstance.id /* Re-render when instance changes */
                      }
                      selectedInstance={selectedInstance}
                    />
                  </ScrollArea>
                </PanelTabsContent>
              </Flex>
            </PanelTabs>
          </div>
        </BindingPopoverProvider>
      </FloatingPanelProvider>
    </EnhancedTooltipProvider>
  );
};
