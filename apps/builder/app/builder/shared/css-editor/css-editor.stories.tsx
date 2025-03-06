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
import { setProperty } from "../../features/style-panel/shared/use-style-data";
import { $awareness } from "~/shared/awareness";
import type { CssStyleMap } from "@webstudio-is/css-engine";

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
  const styleMap: CssStyleMap = new Map([
    ["background-image", backgroundImage.value],
    ["accent-color", { type: "keyword", value: "red" }],
    ["align-content", { type: "keyword", value: "normal" }],
    ["opacity", { type: "unit", unit: "number", value: 11.2 }],
  ]);
  return (
    <CssEditorComponent
      styleMap={styleMap}
      onDeleteProperty={() => undefined}
      onSetProperty={() => () => undefined}
      onAddDeclarations={() => undefined}
      onDeleteAllDeclarations={() => undefined}
    />
  );
};

export default {
  title: "Style Panel",
  component: CssEditor,
};
