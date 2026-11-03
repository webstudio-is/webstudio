import { css } from "@codemirror/lang-css";
import { Box, Label, theme } from "@webstudio-is/design-system";
import {
  generateStyleMap,
  mergeStyles,
  type StyleMap,
} from "@webstudio-is/css-engine";
import { EditorContent, getCodeEditorCssVars } from "~/shared/code-editor-base";
import type { ComputedStyleDecl } from "~/shared/style-object-model";

const extensions = [css()];

export const InheritedStylesPreview = ({
  declarations,
  showCascaded,
  showPreset,
}: {
  declarations: ComputedStyleDecl[];
  showCascaded: boolean;
  showPreset: boolean;
}) => {
  if (!showCascaded && !showPreset) {
    return null;
  }
  const cascaded: StyleMap = new Map();
  const preset: StyleMap = new Map();
  for (const declaration of declarations) {
    if (showCascaded && declaration.source.name === "remote") {
      cascaded.set(declaration.property, declaration.cascadedValue);
    } else if (showPreset && declaration.source.name === "preset") {
      preset.set(declaration.property, declaration.cascadedValue);
    }
  }

  const blocks: Array<{ title: string; value: string }> = [];
  if (cascaded.size > 0) {
    blocks.push({
      title: "Cascaded",
      value: generateStyleMap(mergeStyles(cascaded)),
    });
  }
  if (preset.size > 0) {
    blocks.push({
      title: "Preset",
      value: generateStyleMap(mergeStyles(preset)),
    });
  }
  if (blocks.length === 0) {
    return null;
  }

  return blocks.map(({ title, value }) => (
    <Box
      key={title}
      css={{
        display: "flex",
        flexDirection: "column",
        gap: theme.spacing[1],
        padding: theme.spacing[2],
        ...getCodeEditorCssVars({ minHeight: "3lh", maxHeight: "none" }),
        "& > div:last-child": { background: "transparent" },
      }}
    >
      <Label>{title}</Label>
      <EditorContent
        ariaLabel={title}
        extensions={extensions}
        readOnly
        chromeless
        value={value}
        onChange={() => {}}
        onChangeComplete={() => {}}
      />
    </Box>
  ));
};
