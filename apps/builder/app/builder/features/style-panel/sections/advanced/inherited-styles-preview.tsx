import { Fragment } from "react";
import {
  Box,
  Kbd,
  ResettableLabel,
  Separator,
  SmallIconButton,
  theme,
  Tooltip,
} from "@webstudio-is/design-system";
import { MaximizeIcon } from "@webstudio-is/icons";
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
import {
  openStyleBlockEditor,
  type StyleBlockEditorSource,
} from "./style-block-editor-state";

export const sourceMaximizeHoverCss = {
  "&:hover [data-style-source-maximize], &:focus-within [data-style-source-maximize]":
    {
      opacity: 1,
    },
};

export const AdvancedStyleSourceHeader = ({
  source,
  title,
  description,
  readonly = false,
}: {
  source: StyleBlockEditorSource;
  title: string;
  description: string;
  readonly?: boolean;
}) => {
  const action =
    source === "local"
      ? "Edit local styles"
      : source === "globalVariables"
        ? "View global variables"
        : `View ${title.toLowerCase()} styles`;
  return (
    <Box
      css={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
      }}
    >
      <ResettableLabel
        color={source === "local" ? "local" : "remote"}
        description={description}
      >
        {title}
      </ResettableLabel>
      <Tooltip
        content={
          source === "local" ? (
            <>
              {action} <Kbd value={["alt", "shift", "x"]} />
            </>
          ) : (
            action
          )
        }
      >
        <SmallIconButton
          data-style-source-maximize
          aria-label={action}
          icon={<MaximizeIcon size={12} />}
          disabled={readonly}
          css={{ opacity: 0 }}
          onClick={() => openStyleBlockEditor(source)}
        />
      </Tooltip>
    </Box>
  );
};

export const getAdvancedStyleBlocks = (declarations: ComputedStyleDecl[]) => {
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

  const blocks: Array<{
    source: StyleBlockEditorSource;
    title: string;
    value: string;
    tooltip: string;
  }> = [];
  if (cascaded.size > 0) {
    blocks.push({
      source: "cascaded",
      title: "Cascaded",
      value: generateStyleMap(mergeStyles(cascaded)),
      tooltip:
        "These styles come from another style source, breakpoint, state, or parent element. They are read-only here because this editor changes only the selected style block. Edit the original source to change them, or add the same property above to override them.",
    });
  }
  if (preset.size > 0) {
    blocks.push({
      source: "preset",
      title: "Preset",
      value: generateStyleMap(mergeStyles(preset)),
      tooltip:
        "These styles come from Webstudio component defaults. They are read-only here because they are not part of the selected style block. Add the same property above to override them.",
    });
  }
  if (globalVariables.size > 0) {
    blocks.push({
      source: "globalVariables",
      title: "Global variables",
      value: generateStyleMap(mergeStyles(globalVariables)),
      tooltip:
        "These variables are defined on the Root instance and inherited by this element. They are read-only here because this editor changes only the selected style block. Edit them on Root, or define the same variable above to override them.",
    });
  }
  return blocks;
};

export const InheritedStylesPreview = ({
  declarations,
}: {
  declarations: ComputedStyleDecl[];
}) => {
  const blocks = getAdvancedStyleBlocks(declarations);
  if (blocks.length === 0) {
    return null;
  }

  return blocks.map(({ source, title, value, tooltip }) => (
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
          ...sourceMaximizeHoverCss,
          "& > div:last-child": {
            background: "transparent",
            borderWidth: 0,
            marginInlineStart: `calc(${theme.spacing[2]} + 1px)`,
            padding: 0,
          },
        }}
      >
        <AdvancedStyleSourceHeader
          source={source}
          title={title}
          description={tooltip}
        />
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
