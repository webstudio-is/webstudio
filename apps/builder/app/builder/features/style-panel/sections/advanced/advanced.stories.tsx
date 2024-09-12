import { getStyleDeclKey, type StyleDecl } from "@webstudio-is/sdk";
import { registerContainers } from "~/shared/sync";
import { Section } from "./advanced";
import {
  $breakpoints,
  $selectedBreakpointId,
  $selectedInstanceSelector,
  $styles,
  $styleSourceSelections,
} from "~/shared/nano-states";
import { setProperty } from "../../shared/use-style-data";

const backgroundImage: StyleDecl = {
  breakpointId: "base",
  styleSourceId: "local",
  property: "backgroundImage",
  value: {
    type: "layers",
    value: [{ type: "keyword", value: "none" }],
  },
};

registerContainers();
$breakpoints.set(new Map([["base", { id: "base", label: "" }]]));
$selectedBreakpointId.set("base");
$styles.set(new Map([[getStyleDeclKey(backgroundImage), backgroundImage]]));
$styleSourceSelections.set(
  new Map([["box", { instanceId: "box", values: ["local"] }]])
);
$selectedInstanceSelector.set(["box"]);

setProperty("accentColor")({ type: "keyword", value: "red" });
setProperty("alignContent")({ type: "keyword", value: "normal" });
setProperty("opacity")({ type: "unit", unit: "number", value: 11.2 });

export const Advanced = () => {
  return <Section />;
};

export default {
  title: "Style Panel/Advanced",
  component: Advanced,
};
