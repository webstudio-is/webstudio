import { styled, theme } from "@webstudio-is/design-system";
import { getStyleDeclKey, StyleDecl } from "@webstudio-is/sdk";
import {
  $breakpoints,
  $pages,
  $selectedBreakpointId,
  $styles,
  $styleSources,
  $styleSourceSelections,
} from "~/shared/nano-states";
import { registerContainers } from "~/shared/sync";
import { Section } from "./transitions";
import { $awareness } from "~/shared/awareness";
import { createDefaultPages } from "@webstudio-is/project-build";

const Panel = styled("div", {
  width: theme.spacing[30],
  boxShadow: theme.shadows.panelSectionDropShadow,
});

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
$awareness.set({
  pageId: "homePageId",
  instanceSelector: ["box"],
});

export const Transitions = () => {
  return (
    <Panel>
      <Section />
    </Panel>
  );
};

export default {
  title: "Style Panel/Transitions",
  component: Transitions,
};
