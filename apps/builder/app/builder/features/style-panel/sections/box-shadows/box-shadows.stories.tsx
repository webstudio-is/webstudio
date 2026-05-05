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
import { Section } from "./box-shadows";

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

const outerShadow: StyleDecl = {
  breakpointId: "base",
  styleSourceId: "local",
  property: "boxShadow",
  value: {
    type: "layers",
    value: [
      {
        type: "shadow",
        position: "outset",
        offsetX: { type: "unit", unit: "px", value: 0 },
        offsetY: { type: "unit", unit: "px", value: 2 },
        blur: { type: "unit", unit: "px", value: 5 },
        spread: { type: "unit", unit: "px", value: 0 },
        color: {
          type: "color",
          colorSpace: "srgb",
          alpha: 0.2,
          components: [0, 0, 0],
        },
      },
    ],
  },
};

const insetShadow: StyleDecl = {
  breakpointId: "base",
  styleSourceId: "local",
  property: "boxShadow",
  value: {
    type: "layers",
    value: [
      {
        type: "shadow",
        position: "inset",
        offsetX: { type: "unit", unit: "px", value: 0 },
        offsetY: { type: "unit", unit: "px", value: 0 },
        blur: { type: "unit", unit: "px", value: 10 },
        color: {
          type: "color",
          colorSpace: "srgb",
          alpha: 0.3,
          components: [0, 0, 0],
        },
      },
    ],
  },
};

const multipleShadows: StyleDecl = {
  breakpointId: "base",
  styleSourceId: "local",
  property: "boxShadow",
  value: {
    type: "layers",
    value: [
      {
        type: "shadow",
        position: "outset",
        offsetX: { type: "unit", unit: "px", value: 0 },
        offsetY: { type: "unit", unit: "px", value: 2 },
        blur: { type: "unit", unit: "px", value: 5 },
        color: {
          type: "color",
          colorSpace: "srgb",
          alpha: 0.2,
          components: [0, 0, 0],
        },
      },
      {
        type: "shadow",
        position: "inset",
        offsetX: { type: "unit", unit: "px", value: 0 },
        offsetY: { type: "unit", unit: "px", value: 0 },
        blur: { type: "unit", unit: "px", value: 10 },
        color: {
          type: "color",
          colorSpace: "srgb",
          alpha: 0.3,
          components: [0, 0, 0],
        },
      },
    ],
  },
};

const WithOuterShadowVariant = () => {
  useEffect(() => {
    $styles.set(new Map([[getStyleDeclKey(outerShadow), outerShadow]]));
  }, []);
  return (
    <Box css={{ width: theme.sizes.sidebarWidth }}>
      <Section />
    </Box>
  );
};

const WithInsetShadowVariant = () => {
  useEffect(() => {
    $styles.set(new Map([[getStyleDeclKey(insetShadow), insetShadow]]));
  }, []);
  return (
    <Box css={{ width: theme.sizes.sidebarWidth }}>
      <Section />
    </Box>
  );
};

const WithMultipleShadowsVariant = () => {
  useEffect(() => {
    $styles.set(new Map([[getStyleDeclKey(multipleShadows), multipleShadows]]));
  }, []);
  return (
    <Box css={{ width: theme.sizes.sidebarWidth }}>
      <Section />
    </Box>
  );
};

export const BoxShadows = () => (
  <StorySection title="Box Shadows">
    <Flex direction="column" gap="5">
      <Flex direction="column" gap="5">
        <Text variant="labels">Default</Text>
        <Box css={{ width: theme.sizes.sidebarWidth }}>
          <Section />
        </Box>
      </Flex>
      <Flex direction="column" gap="5">
        <Text variant="labels">With outer shadow</Text>
        <WithOuterShadowVariant />
      </Flex>
      <Flex direction="column" gap="5">
        <Text variant="labels">With inset shadow</Text>
        <WithInsetShadowVariant />
      </Flex>
      <Flex direction="column" gap="5">
        <Text variant="labels">With multiple shadows</Text>
        <WithMultipleShadowsVariant />
      </Flex>
    </Flex>
  </StorySection>
);

export default {
  title: "Style panel/Box Shadows",
  component: Section,
};
