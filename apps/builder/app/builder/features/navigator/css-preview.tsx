import { computed } from "nanostores";
import { useStore } from "@nanostores/react";
import {
  ScrollArea,
  css,
  textVariants,
  theme,
} from "@webstudio-is/design-system";
import {
  generateStyleMap,
  hyphenateProperty,
  mergeStyles,
} from "@webstudio-is/css-engine";
import type { StyleMap, StyleProperty } from "@webstudio-is/css-engine";
import { CollapsibleSection } from "~/builder/shared/collapsible-section";
import { highlightCss } from "~/builder/shared/code-highlight";
import type { ComputedStyleDecl } from "~/shared/style-object-model";
import { $definedComputedStyles } from "~/builder/features/style-panel/shared/model";
import { $selectedInstance } from "~/shared/awareness";

const preStyle = css(textVariants.mono, {
  margin: 0,
  height: theme.spacing[24],
  userSelect: "text",
  cursor: "text",
});

// - Compiles a CSS string from the style engine
// - Groups by category and separates categories with comments
const getCssText = (
  computedStyles: ComputedStyleDecl[],
  instanceId: string
) => {
  const sourceStyles: StyleMap = new Map();
  const cascadedStyles: StyleMap = new Map();
  const presetStyles: StyleMap = new Map();

  // Aggregate styles by category so we can group them when rendering.
  for (const styleDecl of computedStyles) {
    const property = hyphenateProperty(styleDecl.property) as StyleProperty;
    let group;
    if (
      styleDecl.source.name === "local" ||
      styleDecl.source.name === "overwritten"
    ) {
      group = sourceStyles;
    }
    if (styleDecl.source.name === "remote") {
      group = cascadedStyles;
    }
    if (styleDecl.source.name === "preset") {
      group = presetStyles;
    }
    if (group) {
      if (styleDecl.source.instanceId === instanceId) {
        group.set(property, styleDecl.cascadedValue);
      }
    }
  }

  const result: Array<string> = [];

  const add = (comment: string, style: StyleMap) => {
    if (style.size === 0) {
      return;
    }
    result.push(`/* ${comment} */`);
    result.push(generateStyleMap({ style: mergeStyles(style) }));
  };

  add("Style Sources", sourceStyles);
  add("Cascaded", cascadedStyles);
  add("Preset", presetStyles);

  return result.join("\n");
};

const $highlightedCss = computed(
  [$selectedInstance, $definedComputedStyles],
  (instance, computedStyles) => {
    if (instance === undefined) {
      return;
    }
    const cssText = getCssText(computedStyles, instance.id);
    return highlightCss(cssText);
  }
);

export const CssPreview = () => {
  const code = useStore($highlightedCss);
  if (code === undefined) {
    return null;
  }
  return (
    <CollapsibleSection label="CSS Preview" fullWidth>
      <ScrollArea css={{ padding: theme.panel.padding }}>
        <pre tabIndex={0} className={preStyle()}>
          <div
            style={{ whiteSpace: "break-spaces" }}
            dangerouslySetInnerHTML={{ __html: code }}
          ></div>
        </pre>
      </ScrollArea>
    </CollapsibleSection>
  );
};
