import type { Meta, StoryObj } from "@storybook/react";
import { Box, StorySection, theme } from "@webstudio-is/design-system";
import { createDefaultPages } from "@webstudio-is/project-build";
import { $pages, $instances } from "~/shared/sync/data-stores";
import { $userPlanFeatures } from "~/shared/nano-states";
import { registerContainers } from "~/shared/sync/sync-stores";
import { $awareness } from "~/shared/awareness";
import { VariablesSection as VariablesSectionComponent } from "./variables-section";

$userPlanFeatures.set({
  ...$userPlanFeatures.get(),
  allowDynamicData: true,
});

export default {
  title: "Variables Section",
  component: VariablesSectionComponent,
} satisfies Meta;

registerContainers();
$instances.set(
  new Map([
    ["box", { id: "box", type: "instance", component: "Box", children: [] }],
  ])
);
$pages.set(createDefaultPages({ rootInstanceId: "box" }));
$awareness.set({ pageId: "home", instanceSelector: ["box"] });

export const VariablesSection: StoryObj = {
  render: () => (
    <StorySection title="Variables Section">
      <Box css={{ width: theme.sizes.sidebarWidth }}>
        <VariablesSectionComponent />
      </Box>
    </StorySection>
  ),
};
