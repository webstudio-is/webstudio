import type { Meta } from "@storybook/react";
import { Box } from "@webstudio-is/design-system";
import { getStyleDeclKey, StyleDecl } from "@webstudio-is/sdk";
import { InsetControl } from "./inset-control";
import { registerContainers } from "~/shared/sync";
import {
  $breakpoints,
  $selectedBreakpointId,
  $styles,
  $styleSources,
  $styleSourceSelections,
} from "~/shared/nano-states";
import { $awareness } from "~/shared/awareness";

const right: StyleDecl = {
  breakpointId: "base",
  styleSourceId: "local",
  property: "right",
  value: {
    type: "unit",
    value: 123.27,
    unit: "rem",
  },
};

registerContainers();
$breakpoints.set(new Map([["base", { id: "base", label: "" }]]));
$selectedBreakpointId.set("base");
$styleSources.set(
  new Map([
    [
      "local",
      {
        id: "local",
        type: "local",
      },
    ],
  ])
);
$styles.set(new Map([[getStyleDeclKey(right), right]]));
$styleSourceSelections.set(
  new Map([["box", { instanceId: "box", values: ["local"] }]])
);
$awareness.set({
  pageId: "",
  instanceSelector: ["box"],
});

export const InsetControlComponent = () => {
  return (
    <Box css={{ marginLeft: 100 }}>
      <InsetControl />
    </Box>
  );
};

export default {
  title: "Style Panel/Inset",
  component: InsetControlComponent,
} as Meta<typeof InsetControlComponent>;
