import { CssEditor as CssEditorComponent } from "./css-editor";
import type { ComputedStyleDecl } from "~/shared/style-object-model";

export const CssEditor = () => {
  const declarations = [
    [
      "background-image",
      {
        type: "layers",
        value: [{ type: "keyword", value: "none" }],
      },
    ],
    ["accent-color", { type: "keyword", value: "red" }],
    ["align-content", { type: "keyword", value: "normal" }],
    ["opacity", { type: "unit", unit: "number", value: 11.2 }],
  ].map(([property, value]) => {
    return {
      property,
      source: { name: "local" },
      cascadedValue: value,
      computedValue: value,
      usedValue: value,
    } as ComputedStyleDecl;
  });

  return (
    <CssEditorComponent
      declarations={declarations}
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
