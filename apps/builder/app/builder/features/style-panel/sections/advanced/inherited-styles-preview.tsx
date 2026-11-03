import { css } from "@codemirror/lang-css";
import { Fragment } from "react";
import {
  Box,
  ResettableLabel,
  Separator,
  theme,
} from "@webstudio-is/design-system";
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

  const blocks: Array<{ title: string; value: string; tooltip: string }> = [];
  if (cascaded.size > 0) {
    blocks.push({
      title: "Cascaded",
      value: generateStyleMap(mergeStyles(cascaded)),
      tooltip:
        "These styles come from another style source, breakpoint, state, or parent element. They are read-only here because this editor changes only the selected style block. Edit the original source to change them, or add the same property above to override them.",
    });
  }
  if (preset.size > 0) {
    blocks.push({
      title: "Preset",
      value: generateStyleMap(mergeStyles(preset)),
      tooltip:
        "These styles come from Webstudio component defaults. They are read-only here because they are not part of the selected style block. Add the same property above to override them.",
    });
  }
  if (blocks.length === 0) {
    return null;
  }

  return blocks.map(({ title, value, tooltip }) => (
    <Fragment key={title}>
      <Separator />
      <Box
        css={{
          display: "flex",
          flexDirection: "column",
          gap: theme.spacing[1],
          paddingInline: theme.panel.paddingInline,
          paddingBlock: theme.spacing[2],
          ...getCodeEditorCssVars({ minHeight: "3lh", maxHeight: "none" }),
          "& > div:last-child": {
            background: "transparent",
            borderWidth: 0,
            marginInlineStart: `calc(${theme.spacing[2]} + 1px)`,
            padding: 0,
          },
        }}
      >
        <ResettableLabel description={tooltip}>{title}</ResettableLabel>
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
    </Fragment>
  ));
};
