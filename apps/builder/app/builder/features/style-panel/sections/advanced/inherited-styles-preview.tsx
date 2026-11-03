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
import { getCodeEditorCssVars } from "~/shared/code-editor-base";
import type { ComputedStyleDecl } from "~/shared/style-object-model";
import { CssFragmentEditorContent } from "../../shared/css-fragment";
import { cssBlockLanguage } from "./style-block-dialog";
import { getAdvancedStyleSource } from "./stores";

export const InheritedStylesPreview = ({
  declarations,
}: {
  declarations: ComputedStyleDecl[];
}) => {
  const cascaded: StyleMap = new Map();
  const preset: StyleMap = new Map();
  const globalVariables: StyleMap = new Map();
  for (const declaration of declarations) {
    const source = getAdvancedStyleSource(declaration);
    if (source === "cascaded") {
      cascaded.set(declaration.property, declaration.cascadedValue);
    } else if (source === "preset") {
      preset.set(declaration.property, declaration.cascadedValue);
    } else if (source === "globalVariables") {
      globalVariables.set(declaration.property, declaration.cascadedValue);
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
  if (globalVariables.size > 0) {
    blocks.push({
      title: "Global variables",
      value: generateStyleMap(mergeStyles(globalVariables)),
      tooltip:
        "These variables are defined on the Root instance and inherited by this element. They are read-only here because this editor changes only the selected style block. Edit them on Root, or define the same variable above to override them.",
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
        <ResettableLabel color="remote" description={tooltip}>
          {title}
        </ResettableLabel>
        <CssFragmentEditorContent
          ariaLabel={title}
          showLineNumbers={false}
          language={cssBlockLanguage}
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
