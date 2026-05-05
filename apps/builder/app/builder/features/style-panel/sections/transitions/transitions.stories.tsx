import { Box, StorySection, theme } from "@webstudio-is/design-system";
import { getStyleDeclKey, StyleDecl } from "@webstudio-is/sdk";
import { $selectedBreakpointId } from "~/shared/nano-states";
import { $breakpoints } from "~/shared/sync/data-stores";
import {
  $pages,
  $styles,
  $styleSources,
  $styleSourceSelections,
} from "~/shared/sync/data-stores";
import { registerContainers } from "~/shared/sync/sync-stores";
import { Section } from "./transitions";
import {
  $selectedPageId,
  $selectedInstanceSelector,
} from "~/shared/nano-states";
import { createDefaultPages } from "@webstudio-is/project-build";

const transitionProperty: StyleDecl = {
  breakpointId: "base",
  styleSourceId: "local",
  property: "transitionProperty",
  value: {
    type: "layers",
    value: [
      { type: "unparsed", value: "opacity" },
      { type: "unparsed", value: "transform" },
      { type: "keyword", value: "all" },
    ],
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
  new Map([[getStyleDeclKey(transitionProperty), transitionProperty]])
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
$selectedPageId.set("homePageId");
$selectedInstanceSelector.set(["box"]);

export const Transitions = () => (
  <StorySection title="Transitions">
    <Box css={{ width: theme.sizes.sidebarWidth }}>
      <Section />
    </Box>
  </StorySection>
);

export default {
  title: "Style panel/Transitions",
  component: Transitions,
};
