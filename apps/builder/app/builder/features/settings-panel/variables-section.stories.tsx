import type { Meta, StoryObj } from "@storybook/react";
import type { Page } from "@webstudio-is/sdk";
import { Box } from "@webstudio-is/design-system";
import { VariablesSection as VariablesSectionComponent } from "./variables-section";
import {
  $pages,
  $selectedInstanceSelector,
  $selectedPageId,
  $instances,
} from "~/shared/nano-states";
import { registerContainers } from "~/shared/sync";

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
$selectedPageId.set("home");
$pages.set({
  homePage: { id: "home", rootInstanceId: "root" } as Page,
  pages: [],
});

export const VariablesSection: StoryObj = {
  render: () => (
    <Box css={{ paddingLeft: 280 }}>
      <VariablesSectionComponent />
    </Box>
  ),
};
