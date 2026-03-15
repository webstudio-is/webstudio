import type { Meta } from "@storybook/react";
import { Box, StorySection, theme } from "@webstudio-is/design-system";
import { getStyleDeclKey, StyleDecl } from "@webstudio-is/sdk";
import { createDefaultPages } from "@webstudio-is/project-build";
import { InsetControl } from "./inset-control";
import { registerContainers } from "~/shared/sync/sync-stores";
import {
  $breakpoints,
  $pages,
  $selectedBreakpointId,
  $styles,
  $styleSources,
  $styleSourceSelections,
} from "~/shared/nano-states";
import { $awareness } from "~/shared/awareness";

const top: StyleDecl = {
  breakpointId: "base",
  styleSourceId: "local",
  property: "top",
  value: {
    type: "unit",
    value: 0,
    unit: "px",
  },
};

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

const bottom: StyleDecl = {
  breakpointId: "base",
  styleSourceId: "local",
  property: "bottom",
  value: {
    type: "keyword",
    value: "auto",
  },
};

const left: StyleDecl = {
  breakpointId: "base",
  styleSourceId: "local",
  property: "left",
  value: {
    type: "unit",
    value: -20,
    unit: "%",
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
$styles.set(
  new Map([
    [getStyleDeclKey(top), top],
    [getStyleDeclKey(right), right],
    [getStyleDeclKey(bottom), bottom],
    [getStyleDeclKey(left), left],
  ])
);
$styleSourceSelections.set(
  new Map([["box", { instanceId: "box", values: ["local"] }]])
);
$pages.set(
  createDefaultPages({
    homePageId: "homePageId",
    rootInstanceId: "box",
  })
);
$awareness.set({
  pageId: "homePageId",
  instanceSelector: ["box"],
});

export const Inset = () => {
  return (
    <StorySection title="Inset control">
      <Box css={{ width: theme.sizes.sidebarWidth }}>
        <InsetControl />
      </Box>
    </StorySection>
  );
};

export default {
  title: "Style panel/Inset",
  component: Inset,
} as Meta<typeof Inset>;
