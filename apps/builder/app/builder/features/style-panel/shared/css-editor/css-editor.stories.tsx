import { getStyleDeclKey, type StyleDecl } from "@webstudio-is/sdk";
import { registerContainers } from "~/shared/sync";
import { CssEditor as CssEditorComponent } from "./css-editor";
import {
  $breakpoints,
  $instances,
  $selectedBreakpointId,
  $styles,
  $styleSourceSelections,
} from "~/shared/nano-states";
import { setProperty } from "../use-style-data";
import { $awareness } from "~/shared/awareness";

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
$instances.set(
  new Map([
    ["box", { type: "instance", id: "box", component: "Box", children: [] }],
  ])
);
$awareness.set({
  pageId: "",
  instanceSelector: ["box"],
});

setProperty("accentColor")({ type: "keyword", value: "red" });
setProperty("alignContent")({ type: "keyword", value: "normal" });
setProperty("opacity")({ type: "unit", unit: "number", value: 11.2 });

export const CssEditor = () => {
  const styleMap = new Map([
    ["backgroundImage", backgroundImage.value],
    ["accentColor", { type: "keyword", value: "red" }],
    ["alignContent", { type: "keyword", value: "normal" }],
    ["opacity", { type: "unit", unit: "number", value: 11.2 }],
  ]);
  return (
    <CssEditorComponent
      styleMap={styleMap}
      deleteProperty={() => undefined}
      setProperty={() => () => undefined}
      addProperties={() => undefined}
    />
  );
};

export default {
  title: "Style Panel",
  component: CssEditor,
};
