import { StorySection } from "@webstudio-is/design-system";
import { CssEditor as CssEditorComponent } from "./css-editor";
import type { ComputedStyleDecl } from "~/shared/style-object-model";

export const CSSEditor = () => {
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
    <StorySection title="CSS Editor">
      <CssEditorComponent
        declarations={declarations}
        onDeleteProperty={() => undefined}
        onSetProperty={() => () => undefined}
        onAddDeclarations={() => undefined}
        onDeleteAllDeclarations={() => undefined}
      />
    </StorySection>
  );
};

export default {
  title: "Style panel/CSS Editor",
  component: CSSEditor,
};
