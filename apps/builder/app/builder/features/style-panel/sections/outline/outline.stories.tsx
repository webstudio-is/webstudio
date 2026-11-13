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
import { Section } from "./outline";
registerContainers();
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
    <StorySection title="Outline">
      {ready && (
        <Box css={{ width: theme.sizes.sidebarWidth }}>
          <Section />
        </Box>
      )}
    </StorySection>
  );
};
export default { title: "Style panel/Outline", component: Section };
export const Default = () => <StyleStory declarations={[]} />;
export const Solid = () => (
  <StyleStory declarations={[solidOutline, outlineWidth]} />
);
export const Dashed = () => (
  <StyleStory
    declarations={[dashedOutline, outlineColor, outlineWidth, outlineOffset]}
  />
);
