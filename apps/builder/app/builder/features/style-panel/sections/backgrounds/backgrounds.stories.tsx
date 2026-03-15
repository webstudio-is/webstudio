import { useEffect } from "react";
import { getStyleDeclKey, type StyleDecl } from "@webstudio-is/sdk";
import {
  Box,
  Flex,
  StorySection,
  Text,
  theme,
} from "@webstudio-is/design-system";
import { registerContainers } from "~/shared/sync/sync-stores";
import {
  $breakpoints,
  $instances,
  $selectedBreakpointId,
  $styles,
  $styleSourceSelections,
} from "~/shared/nano-states";
import { Section as SectionComponent } from "./backgrounds";
import { $awareness } from "~/shared/awareness";

const backgroundImage: StyleDecl = {
  breakpointId: "base",
  styleSourceId: "local",
  property: "backgroundImage",
  value: {
    type: "layers",
    value: [
      {
        type: "unparsed",
        value: "linear-gradient(red, yellow)",
      },
      {
        type: "unparsed",
        value: "linear-gradient(blue, red)",
      },
      {
        type: "keyword",
        value: "none",
      },
    ],
  },
};

registerContainers();
$breakpoints.set(new Map([["base", { id: "base", label: "" }]]));
$selectedBreakpointId.set("base");
$styles.set(new Map([[getStyleDeclKey(backgroundImage), backgroundImage]]));
$styleSourceSelections.set(
  new Map([["box", { instanceId: "box", values: ["local"] }]])
);
$instances.set(
  new Map([
    ["box", { type: "instance", id: "box", component: "Box", children: [] }],
  ])
);
$awareness.set({
  pageId: "",
  instanceSelector: ["box"],
});

const SingleLayerVariant = () => {
  useEffect(() => {
    const singleBackground: StyleDecl = {
      breakpointId: "base",
      styleSourceId: "local",
      property: "backgroundImage",
      value: {
        type: "layers",
        value: [
          {
            type: "unparsed",
            value: "linear-gradient(to right, red, orange)",
          },
        ],
      },
    };
    $styles.set(
      new Map([[getStyleDeclKey(singleBackground), singleBackground]])
    );
  }, []);
  return (
    <Box css={{ width: theme.sizes.sidebarWidth }}>
      <SectionComponent />
    </Box>
  );
};

const EmptyBackgroundsVariant = () => {
  useEffect(() => {
    $styles.set(new Map());
  }, []);
  return (
    <Box css={{ width: theme.sizes.sidebarWidth }}>
      <SectionComponent />
    </Box>
  );
};

export const Backgrounds = () => (
  <StorySection title="Backgrounds">
    <Flex direction="column" gap="5">
      <Flex direction="column" gap="5">
        <Text variant="labels">Default (multiple layers)</Text>
        <Box css={{ width: theme.sizes.sidebarWidth }}>
          <SectionComponent />
        </Box>
      </Flex>
      <Flex direction="column" gap="5">
        <Text variant="labels">Single layer</Text>
        <SingleLayerVariant />
      </Flex>
      <Flex direction="column" gap="5">
        <Text variant="labels">Empty backgrounds</Text>
        <EmptyBackgroundsVariant />
      </Flex>
    </Flex>
  </StorySection>
);

export default {
  title: "Style panel/Backgrounds/Section",
  component: SectionComponent,
};
