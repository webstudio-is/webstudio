import { css } from "@codemirror/lang-css";
import { Box, theme } from "@webstudio-is/design-system";
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
}: {
  declarations: ComputedStyleDecl[];
}) => {
  const cascaded: StyleMap = new Map();
  const preset: StyleMap = new Map();
  for (const declaration of declarations) {
    if (declaration.source.name === "remote") {
      cascaded.set(declaration.property, declaration.cascadedValue);
    } else if (declaration.source.name === "preset") {
      preset.set(declaration.property, declaration.cascadedValue);
    }
  }

  const blocks: string[] = [];
  if (cascaded.size > 0) {
    blocks.push(`/* Cascaded */\n${generateStyleMap(mergeStyles(cascaded))}`);
  }
  if (preset.size > 0) {
    blocks.push(`/* Preset */\n${generateStyleMap(mergeStyles(preset))}`);
  }
  if (blocks.length === 0) {
    return null;
  }

  return (
    <Box
      css={{
        padding: theme.spacing[2],
        ...getCodeEditorCssVars({ minHeight: "3lh", maxHeight: "50vh" }),
        "& > div": { background: "transparent" },
      }}
    >
      <EditorContent
        ariaLabel="CSS preview"
        extensions={extensions}
        readOnly
        chromeless
        value={blocks.join("\n\n")}
        onChange={() => {}}
        onChangeComplete={() => {}}
      />
    </Box>
  );
};
