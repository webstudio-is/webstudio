import { getStyleDeclKey, type StyleDecl } from "@webstudio-is/sdk";
import { styled, theme } from "@webstudio-is/design-system";
import { registerContainers } from "~/shared/sync";
import {
  $breakpoints,
  $instances,
  $selectedBreakpointId,
  $styles,
  $styleSourceSelections,
} from "~/shared/nano-states";
import { Section } from "./backgrounds";
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

const Panel = styled("div", {
  width: theme.spacing[30],
});

export const Backgrounds = () => {
  return (
    <Panel>
      <Section />
    </Panel>
  );
};

export default {
  title: "Style Panel/Background",
  component: Section,
};
