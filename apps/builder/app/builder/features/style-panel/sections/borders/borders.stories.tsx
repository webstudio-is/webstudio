import { useEffect, useState } from "react";
import { Box, StorySection, theme } from "@webstudio-is/design-system";
import { getStyleDeclKey, type StyleDecl } from "@webstudio-is/sdk";
import { createDefaultPages } from "@webstudio-is/project-build";
import {
  $selectedBreakpointId,
  $selectedPageId,
  $allSelectedInstanceSelectors,
  selectInstance,
} from "~/shared/nano-states";
import { $instanceSelectionUpdate } from "~/shared/nano-states/instance-selection";
import {
  $instances,
  $pages,
  $styles,
  $styleSources,
  $styleSourceSelections,
  $breakpoints,
} from "~/shared/sync/data-stores";
import { registerContainers } from "~/shared/sync/sync-stores";
import { Section } from "./borders";
registerContainers();
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

const StyleStory = ({ declarations }: { declarations: StyleDecl[] }) => {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const previous = {
      instances: $instances.get(),
      pages: $pages.get(),
      styles: $styles.get(),
      sources: $styleSources.get(),
      selections: $styleSourceSelections.get(),
      breakpoints: $breakpoints.get(),
      selectedBreakpoint: $selectedBreakpointId.get(),
      selectedPage: $selectedPageId.get(),
      selectedInstances: $allSelectedInstanceSelectors.get(),
      selectionUpdate: $instanceSelectionUpdate.get(),
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
      new Map(declarations.map((value) => [getStyleDeclKey(value), value]))
    );
    selectInstance(["box"]);
    setReady(true);
    return () => {
      setReady(false);
      $instances.set(previous.instances);
      $pages.set(previous.pages);
      $styles.set(previous.styles);
      $styleSources.set(previous.sources);
      $styleSourceSelections.set(previous.selections);
      $breakpoints.set(previous.breakpoints);
      $selectedBreakpointId.set(previous.selectedBreakpoint);
      $selectedPageId.set(previous.selectedPage);
      $allSelectedInstanceSelectors.set(previous.selectedInstances);
      $instanceSelectionUpdate.set(previous.selectionUpdate);
    };
  }, [declarations]);
  return (
    <StorySection title="Borders">
      {ready && (
        <Box css={{ width: theme.sizes.sidebarWidth }}>
          <Section />
        </Box>
      )}
    </StorySection>
  );
};
export default { title: "Style panel/Borders", component: Section };
export const Default = () => <StyleStory declarations={[]} />;
export const Solid = () => (
  <StyleStory
    declarations={[
      solidBorderTop,
      solidBorderRight,
      solidBorderBottom,
      solidBorderLeft,
      borderWidthTop,
    ]}
  />
);
export const Mixed = () => (
  <StyleStory
    declarations={[dashedBorderTop, dottedBorderBottom, borderRadius]}
  />
);
