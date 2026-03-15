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
import { Section } from "./outline";

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

const solidOutline: StyleDecl = {
  breakpointId: "base",
  styleSourceId: "local",
  property: "outlineStyle",
  value: { type: "keyword", value: "solid" },
};

const outlineWidth: StyleDecl = {
  breakpointId: "base",
  styleSourceId: "local",
  property: "outlineWidth",
  value: { type: "unit", value: 2, unit: "px" },
};

const dashedOutline: StyleDecl = {
  breakpointId: "base",
  styleSourceId: "local",
  property: "outlineStyle",
  value: { type: "keyword", value: "dashed" },
};

const outlineColor: StyleDecl = {
  breakpointId: "base",
  styleSourceId: "local",
  property: "outlineColor",
  value: { type: "keyword", value: "red" },
};

const outlineOffset: StyleDecl = {
  breakpointId: "base",
  styleSourceId: "local",
  property: "outlineOffset",
  value: { type: "unit", value: 4, unit: "px" },
};

export const Outline = () => (
  <Box css={{ width: theme.sizes.sidebarWidth }}>
    <Section />
  </Box>
);

export const WithSolidOutline = () => {
  useEffect(() => {
    $styles.set(
      new Map([
        [getStyleDeclKey(solidOutline), solidOutline],
        [getStyleDeclKey(outlineWidth), outlineWidth],
      ])
    );
  }, []);
  return (
    <Box css={{ width: theme.sizes.sidebarWidth }}>
      <Section />
    </Box>
  );
};

export const WithDashedOutline = () => {
  useEffect(() => {
    $styles.set(
      new Map([
        [getStyleDeclKey(dashedOutline), dashedOutline],
        [getStyleDeclKey(outlineColor), outlineColor],
        [getStyleDeclKey(outlineWidth), outlineWidth],
        [getStyleDeclKey(outlineOffset), outlineOffset],
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
  title: "Style panel/Outline",
  component: Section,
};
