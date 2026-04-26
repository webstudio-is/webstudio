import { useEffect } from "react";
import {
  Box,
  Flex,
  StorySection,
  Text,
  theme,
} from "@webstudio-is/design-system";
import { getStyleDeclKey, type StyleDecl } from "@webstudio-is/sdk";
import { $selectedBreakpointId } from "~/shared/nano-states";
import { $breakpoints } from "~/shared/sync/data-stores";
import {
  $instances,
  $pages,
  $styles,
  $styleSources,
  $styleSourceSelections,
} from "~/shared/sync/data-stores";
import { registerContainers } from "~/shared/sync/sync-stores";
import { createDefaultPages } from "@webstudio-is/project-build";
import {
  $selectedPageId,
  $selectedInstanceSelector,
} from "~/shared/nano-states";
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
$selectedPageId.set("homePageId");
$selectedInstanceSelector.set(["box"]);

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

const WithSolidOutlineVariant = () => {
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

const WithDashedOutlineVariant = () => {
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

export const Outline = () => (
  <StorySection title="Outline">
    <Flex direction="column" gap="5">
      <Flex direction="column" gap="5">
        <Text variant="labels">Default</Text>
        <Box css={{ width: theme.sizes.sidebarWidth }}>
          <Section />
        </Box>
      </Flex>
      <Flex direction="column" gap="5">
        <Text variant="labels">With solid outline</Text>
        <WithSolidOutlineVariant />
      </Flex>
      <Flex direction="column" gap="5">
        <Text variant="labels">With dashed outline</Text>
        <WithDashedOutlineVariant />
      </Flex>
    </Flex>
  </StorySection>
);

export default {
  title: "Style panel/Outline",
  component: Section,
};
