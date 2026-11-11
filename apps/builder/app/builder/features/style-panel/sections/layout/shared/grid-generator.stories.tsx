import { useEffect, useState } from "react";
import { getStyleDeclKey, type StyleDecl } from "@webstudio-is/sdk";
import { Box, StorySection, theme } from "@webstudio-is/design-system";
import {
  $allSelectedInstanceSelectors,
  $selectedBreakpointId,
  $selectedPageId,
  selectInstance,
} from "~/shared/nano-states";
import {
  $breakpoints,
  $instances,
  $styles,
  $styleSourceSelections,
} from "~/shared/sync/data-stores";
import { registerContainers } from "~/shared/sync/sync-stores";
import { GridGenerator } from "./grid-generator";

registerContainers();

export default {
  title: "Style panel/Grid generator",
  component: GridGenerator,
};

export const Open = () => {
  const [open, setOpen] = useState(true);

  useEffect(() => {
    const previous = {
      breakpoints: $breakpoints.get(),
      selectedBreakpointId: $selectedBreakpointId.get(),
      styles: $styles.get(),
      styleSourceSelections: $styleSourceSelections.get(),
      instances: $instances.get(),
      selectedPageId: $selectedPageId.get(),
      selectedInstances: $allSelectedInstanceSelectors.get(),
    };
    const tracks: StyleDecl[] = (
      ["gridTemplateColumns", "gridTemplateRows"] as const
    ).map((property) => ({
      breakpointId: "base",
      styleSourceId: "local",
      property,
      value: { type: "unparsed", value: "1fr 1fr" },
    }));

    $breakpoints.set(new Map([["base", { id: "base", label: "" }]]));
    $selectedBreakpointId.set("base");
    $styles.set(
      new Map(tracks.map((track) => [getStyleDeclKey(track), track]))
    );
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
    $selectedPageId.set("");
    selectInstance(["box"]);

    return () => {
      $breakpoints.set(previous.breakpoints);
      $selectedBreakpointId.set(previous.selectedBreakpointId);
      $styles.set(previous.styles);
      $styleSourceSelections.set(previous.styleSourceSelections);
      $instances.set(previous.instances);
      $selectedPageId.set(previous.selectedPageId);
      $allSelectedInstanceSelectors.set(previous.selectedInstances);
    };
  }, []);

  return (
    <StorySection title="Grid generator">
      <Box
        data-floating-panel-container
        css={{
          width: theme.sizes.sidebarWidth,
          height: 720,
          marginLeft: 360,
          marginTop: 100,
        }}
      >
        <GridGenerator open={open} onOpenChange={setOpen} />
      </Box>
    </StorySection>
  );
};
