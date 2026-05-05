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
import { Section } from "./filter";

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

const blurFilterStyle: StyleDecl = {
  breakpointId: "base",
  styleSourceId: "local",
  property: "filter",
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

const multipleFilterStyles: StyleDecl = {
  breakpointId: "base",
  styleSourceId: "local",
  property: "filter",
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
        name: "grayscale",
        args: {
          type: "tuple",
          value: [{ type: "unit", unit: "%", value: 50 }],
        },
      },
    ],
  },
};

const WithBlurFilterVariant = () => {
  useEffect(() => {
    $styles.set(new Map([[getStyleDeclKey(blurFilterStyle), blurFilterStyle]]));
  }, []);
  return (
    <Box css={{ width: theme.sizes.sidebarWidth }}>
      <Section />
    </Box>
  );
};

const WithMultipleFiltersVariant = () => {
  useEffect(() => {
    $styles.set(
      new Map([[getStyleDeclKey(multipleFilterStyles), multipleFilterStyles]])
    );
  }, []);
  return (
    <Box css={{ width: theme.sizes.sidebarWidth }}>
      <Section />
    </Box>
  );
};

export const Filters = () => (
  <StorySection title="Filters">
    <Flex direction="column" gap="5">
      <Flex direction="column" gap="5">
        <Text variant="labels">Default</Text>
        <Box css={{ width: theme.sizes.sidebarWidth }}>
          <Section />
        </Box>
      </Flex>
      <Flex direction="column" gap="5">
        <Text variant="labels">With blur filter</Text>
        <WithBlurFilterVariant />
      </Flex>
      <Flex direction="column" gap="5">
        <Text variant="labels">With multiple filters</Text>
        <WithMultipleFiltersVariant />
      </Flex>
    </Flex>
  </StorySection>
);

export default {
  title: "Style panel/Filters",
  component: Section,
};
