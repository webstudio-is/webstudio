import { useEffect } from "react";
import { Box, StorySection, theme } from "@webstudio-is/design-system";
import { getStyleDeclKey, type StyleDecl } from "@webstudio-is/sdk";
import {
  $allSelectedInstanceSelectors,
  $selectedBreakpointId,
  $selectedPageId,
  selectInstance,
} from "~/shared/nano-states";
import {
  $breakpoints,
  $instances,
  $pages,
  $styles,
  $styleSources,
  $styleSourceSelections,
} from "~/shared/sync/data-stores";
import { registerContainers } from "~/shared/sync/sync-stores";
import { createDefaultPages } from "@webstudio-is/project-build";
import { Section } from "./backdrop-filter";

registerContainers();

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

const BackdropFilterStory = ({ style }: { style?: StyleDecl }) => {
  useEffect(() => {
    const previous = {
      breakpoints: $breakpoints.get(),
      selectedBreakpointId: $selectedBreakpointId.get(),
      styleSources: $styleSources.get(),
      styleSourceSelections: $styleSourceSelections.get(),
      instances: $instances.get(),
      pages: $pages.get(),
      selectedPageId: $selectedPageId.get(),
      selectedInstances: $allSelectedInstanceSelectors.get(),
      styles: $styles.get(),
    };
    $breakpoints.set(new Map([["base", { id: "base", label: "" }]]));
    $selectedBreakpointId.set("base");
    $styleSources.set(new Map([["local", { id: "local", type: "local" }]]));
    $styleSourceSelections.set(
      new Map([["box", { instanceId: "box", values: ["local"] }]])
    );
    $instances.set(
      new Map([
        [
          "box",
          { type: "instance", id: "box", component: "Box", children: [] },
        ],
      ])
    );
    $pages.set(
      createDefaultPages({ homePageId: "homePageId", rootInstanceId: "box" })
    );
    $selectedPageId.set("homePageId");
    $styles.set(
      style === undefined
        ? new Map()
        : new Map([[getStyleDeclKey(style), style]])
    );
    selectInstance(["box"]);
    return () => {
      $breakpoints.set(previous.breakpoints);
      $selectedBreakpointId.set(previous.selectedBreakpointId);
      $styleSources.set(previous.styleSources);
      $styleSourceSelections.set(previous.styleSourceSelections);
      $instances.set(previous.instances);
      $pages.set(previous.pages);
      $selectedPageId.set(previous.selectedPageId);
      $allSelectedInstanceSelectors.set(previous.selectedInstances);
      $styles.set(previous.styles);
    };
  }, [style]);
  return (
    <StorySection title="Backdrop filters">
      <Box css={{ width: theme.sizes.sidebarWidth }}>
        <Section />
      </Box>
    </StorySection>
  );
};

export default {
  title: "Style panel/Backdrop filters",
  component: Section,
};

export const Empty = () => <BackdropFilterStory />;
export const Blur = () => <BackdropFilterStory style={blurBackdropFilter} />;
export const Multiple = () => (
  <BackdropFilterStory style={multipleBackdropFilters} />
);
