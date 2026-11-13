import { useEffect } from "react";
import { getStyleDeclKey, type StyleDecl } from "@webstudio-is/sdk";
import { Box, StorySection, theme } from "@webstudio-is/design-system";
import { createDefaultPages } from "@webstudio-is/project-build";
import type { StyleValue } from "@webstudio-is/css-engine";
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
  $styleSourceSelections,
} from "~/shared/sync/data-stores";
import { registerContainers } from "~/shared/sync/sync-stores";
import { BackgroundContent as BackgroundContentPanel } from "./background-content";

registerContainers();

type BackgroundLayer = Extract<StyleValue, { type: "layers" }>["value"][number];

const BackgroundStory = ({ styleValue }: { styleValue: BackgroundLayer }) => {
  useEffect(() => {
    const previous = {
      breakpoints: $breakpoints.get(),
      selectedBreakpointId: $selectedBreakpointId.get(),
      styleSourceSelections: $styleSourceSelections.get(),
      instances: $instances.get(),
      pages: $pages.get(),
      selectedPageId: $selectedPageId.get(),
      selectedInstances: $allSelectedInstanceSelectors.get(),
      styles: $styles.get(),
    };
    const backgroundImage: StyleDecl = {
      breakpointId: "base",
      styleSourceId: "local",
      property: "backgroundImage",
      value: { type: "layers", value: [styleValue] },
    };
    $breakpoints.set(new Map([["base", { id: "base", label: "" }]]));
    $selectedBreakpointId.set("base");
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
    $styles.set(new Map([[getStyleDeclKey(backgroundImage), backgroundImage]]));
    selectInstance(["box"]);
    return () => {
      $breakpoints.set(previous.breakpoints);
      $selectedBreakpointId.set(previous.selectedBreakpointId);
      $styleSourceSelections.set(previous.styleSourceSelections);
      $instances.set(previous.instances);
      $pages.set(previous.pages);
      $selectedPageId.set(previous.selectedPageId);
      $allSelectedInstanceSelectors.set(previous.selectedInstances);
      $styles.set(previous.styles);
    };
  }, [styleValue]);

  return (
    <StorySection title="Background content">
      <Box css={{ width: theme.sizes.sidebarWidth }}>
        <BackgroundContentPanel index={0} />
      </Box>
    </StorySection>
  );
};

export default {
  title: "Style panel/Backgrounds",
  component: BackgroundContentPanel,
};

export const None = () => (
  <BackgroundStory styleValue={{ type: "keyword", value: "none" }} />
);
export const LinearGradient = () => (
  <BackgroundStory
    styleValue={{
      type: "unparsed",
      value:
        "linear-gradient(135deg, rgba(255,126,95,1) 0%, rgba(254,180,123,1) 35%, rgba(134,168,231,1) 100%)",
    }}
  />
);
export const ConicGradient = () => (
  <BackgroundStory
    styleValue={{
      type: "unparsed",
      value:
        "conic-gradient(from 0deg at 50% 50%, rgba(255,126,95,1) 0deg, rgba(254,180,123,1) 120deg, rgba(134,168,231,1) 240deg, rgba(255,126,95,1) 360deg)",
    }}
  />
);
export const RadialGradient = () => (
  <BackgroundStory
    styleValue={{
      type: "unparsed",
      value:
        "radial-gradient(circle at 50% 50%, rgba(255,126,95,1) 0%, rgba(254,180,123,1) 50%, rgba(134,168,231,1) 100%)",
    }}
  />
);
export const Solid = () => (
  <BackgroundStory
    styleValue={{
      type: "unparsed",
      value:
        "linear-gradient(0deg, rgba(56,189,248,1) 0%, rgba(56,189,248,1) 100%)",
    }}
  />
);
export const RepeatingLinearGradient = () => (
  <BackgroundStory
    styleValue={{
      type: "unparsed",
      value:
        "repeating-linear-gradient(45deg, rgba(255,0,0,1) 0%, rgba(0,0,255,1) 10%, rgba(255,0,0,1) 20%)",
    }}
  />
);
export const MultiStopGradient = () => (
  <BackgroundStory
    styleValue={{
      type: "unparsed",
      value:
        "linear-gradient(90deg, rgba(255,0,0,1) 0%, rgba(255,165,0,1) 20%, rgba(255,255,0,1) 40%, rgba(0,128,0,1) 60%, rgba(0,0,255,1) 80%, rgba(128,0,128,1) 100%)",
    }}
  />
);
