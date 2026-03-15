import { useEffect } from "react";
import {
  Box,
  Flex,
  StorySection,
  Text,
  theme,
} from "@webstudio-is/design-system";
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
import { Section } from "./borders";

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

const solidBorderTop: StyleDecl = {
  breakpointId: "base",
  styleSourceId: "local",
  property: "borderTopStyle",
  value: { type: "keyword", value: "solid" },
};

const solidBorderRight: StyleDecl = {
  breakpointId: "base",
  styleSourceId: "local",
  property: "borderRightStyle",
  value: { type: "keyword", value: "solid" },
};

const solidBorderBottom: StyleDecl = {
  breakpointId: "base",
  styleSourceId: "local",
  property: "borderBottomStyle",
  value: { type: "keyword", value: "solid" },
};

const solidBorderLeft: StyleDecl = {
  breakpointId: "base",
  styleSourceId: "local",
  property: "borderLeftStyle",
  value: { type: "keyword", value: "solid" },
};

const borderWidthTop: StyleDecl = {
  breakpointId: "base",
  styleSourceId: "local",
  property: "borderTopWidth",
  value: { type: "unit", value: 2, unit: "px" },
};

const dashedBorderTop: StyleDecl = {
  breakpointId: "base",
  styleSourceId: "local",
  property: "borderTopStyle",
  value: { type: "keyword", value: "dashed" },
};

const dottedBorderBottom: StyleDecl = {
  breakpointId: "base",
  styleSourceId: "local",
  property: "borderBottomStyle",
  value: { type: "keyword", value: "dotted" },
};

const borderRadius: StyleDecl = {
  breakpointId: "base",
  styleSourceId: "local",
  property: "borderTopLeftRadius",
  value: { type: "unit", value: 8, unit: "px" },
};

const WithSolidBorderVariant = () => {
  useEffect(() => {
    $styles.set(
      new Map([
        [getStyleDeclKey(solidBorderTop), solidBorderTop],
        [getStyleDeclKey(solidBorderRight), solidBorderRight],
        [getStyleDeclKey(solidBorderBottom), solidBorderBottom],
        [getStyleDeclKey(solidBorderLeft), solidBorderLeft],
        [getStyleDeclKey(borderWidthTop), borderWidthTop],
      ])
    );
  }, []);
  return (
    <Box css={{ width: theme.sizes.sidebarWidth }}>
      <Section />
    </Box>
  );
};

const WithMixedBordersVariant = () => {
  useEffect(() => {
    $styles.set(
      new Map([
        [getStyleDeclKey(dashedBorderTop), dashedBorderTop],
        [getStyleDeclKey(dottedBorderBottom), dottedBorderBottom],
        [getStyleDeclKey(borderRadius), borderRadius],
      ])
    );
  }, []);
  return (
    <Box css={{ width: theme.sizes.sidebarWidth }}>
      <Section />
    </Box>
  );
};

export const Borders = () => (
  <StorySection title="Borders">
    <Flex direction="column" gap="5">
      <Flex direction="column" gap="5">
        <Text variant="labels">Default</Text>
        <Box css={{ width: theme.sizes.sidebarWidth }}>
          <Section />
        </Box>
      </Flex>
      <Flex direction="column" gap="5">
        <Text variant="labels">With solid border</Text>
        <WithSolidBorderVariant />
      </Flex>
      <Flex direction="column" gap="5">
        <Text variant="labels">With mixed borders</Text>
        <WithMixedBordersVariant />
      </Flex>
    </Flex>
  </StorySection>
);

export default {
  title: "Style panel/Borders",
  component: Section,
};
