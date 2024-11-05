import type { Meta, StoryObj } from "@storybook/react";
import { Box } from "@webstudio-is/design-system";
import { VariablesSection as VariablesSectionComponent } from "./variables-section";
import {
  $pages,
  $selectedInstanceSelector,
  $instances,
} from "~/shared/nano-states";
import { registerContainers } from "~/shared/sync";
import { createDefaultPages } from "@webstudio-is/project-build";
import { $userPlanFeatures } from "~/builder/shared/nano-states";
import { $awareness } from "~/shared/awareness";

$userPlanFeatures.set({
  ...$userPlanFeatures.get(),
  allowDynamicData: true,
});

export default {
  title: "Builder/Variables Section",
  component: VariablesSectionComponent,
} satisfies Meta;

registerContainers();
$selectedInstanceSelector.set(["root"]);
$instances.set(
  new Map([
    ["root", { id: "root", type: "instance", component: "Box", children: [] }],
  ])
);
$awareness.set({ pageId: "home" });
$pages.set(
  createDefaultPages({ rootInstanceId: "root", systemDataSourceId: "system" })
);

export const VariablesSection: StoryObj = {
  render: () => (
    <Box css={{ paddingLeft: 280 }}>
      <VariablesSectionComponent />
    </Box>
  ),
};
