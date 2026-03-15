import { useEffect } from "react";
import { Box, theme } from "@webstudio-is/design-system";
import { getStyleDeclKey, type StyleDecl } from "@webstudio-is/sdk";
import {
  $breakpoints,
  $instances,
  $pages,
  $selectedBreakpointId,
  $styles,
  $styleSources,
  $styleSourceSelections,
} from "~/shared/nano-states";
import { registerContainers } from "~/shared/sync/sync-stores";
import { createDefaultPages } from "@webstudio-is/project-build";
import { $awareness } from "~/shared/awareness";
import { Section } from "./backdrop-filter";

registerContainers();
$breakpoints.set(new Map([["base", { id: "base", label: "" }]]));
$selectedBreakpointId.set("base");
$styleSources.set(new Map([["local", { id: "local", type: "local" }]]));
$styleSourceSelections.set(
  new Map([["box", { instanceId: "box", values: ["local"] }]])
);
$instances.set(
  new Map([
    ["box", { type: "instance", id: "box", component: "Box", children: [] }],
  ])
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

const blurBackdropFilter: StyleDecl = {
  breakpointId: "base",
  styleSourceId: "local",
  property: "backdropFilter",
  value: {
    type: "tuple",
    value: [
      {
        type: "function",
        name: "blur",
        args: {
          type: "tuple",
          value: [{ type: "unit", unit: "px", value: 4 }],
        },
      },
    ],
  },
};

const multipleBackdropFilters: StyleDecl = {
  breakpointId: "base",
  styleSourceId: "local",
  property: "backdropFilter",
  value: {
    type: "tuple",
    value: [
      {
        type: "function",
        name: "blur",
        args: {
          type: "tuple",
          value: [{ type: "unit", unit: "px", value: 4 }],
        },
      },
      {
        type: "function",
        name: "brightness",
        args: {
          type: "tuple",
          value: [{ type: "unit", unit: "%", value: 150 }],
        },
      },
      {
        type: "function",
        name: "contrast",
        args: {
          type: "tuple",
          value: [{ type: "unit", unit: "%", value: 200 }],
        },
      },
    ],
  },
};

export const BackdropFilters = () => (
  <Box css={{ width: theme.sizes.sidebarWidth }}>
    <Section />
  </Box>
);

export const WithBlurFilter = () => {
  useEffect(() => {
    $styles.set(
      new Map([[getStyleDeclKey(blurBackdropFilter), blurBackdropFilter]])
    );
  }, []);
  return (
    <Box css={{ width: theme.sizes.sidebarWidth }}>
      <Section />
    </Box>
  );
};

export const WithMultipleFilters = () => {
  useEffect(() => {
    $styles.set(
      new Map([
        [getStyleDeclKey(multipleBackdropFilters), multipleBackdropFilters],
      ])
    );
  }, []);
  return (
    <Box css={{ width: theme.sizes.sidebarWidth }}>
      <Section />
    </Box>
  );
};

export default {
  title: "Style panel/Backdrop filters",
  component: Section,
};
