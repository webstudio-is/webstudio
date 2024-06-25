import {
  ScrollArea,
  css,
  textVariants,
  theme,
} from "@webstudio-is/design-system";
import {
  type StyleInfo,
  useStyleInfo,
} from "../../../style-panel/shared/style-info";
import {
  generateStyleMap,
  hyphenateProperty,
  mergeStyles,
} from "@webstudio-is/css-engine";
import type { StyleMap, StyleProperty } from "@webstudio-is/css-engine";
import { CollapsibleSection } from "~/builder/shared/collapsible-section";
import { useMemo } from "react";
import Prism from "prismjs";
import { captureError } from "@webstudio-is/error-utils";

const preStyle = css(textVariants.mono, {
  margin: 0,
  height: theme.spacing[24],
  userSelect: "text",
  cursor: "text",
});

// - Compiles a CSS string from the style info
// - Groups by category and separates categories with comments
const getCssText = (currentStyle: StyleInfo) => {
  const sourceStyles: StyleMap = new Map();
  const inheritedStyles: StyleMap = new Map();
  const cascadedStyles: StyleMap = new Map();
  const presetStyles: StyleMap = new Map();

  // Aggregate styles by category so we can group them when rendering.
  let property: StyleProperty;
  for (property in currentStyle) {
    const value = currentStyle[property];
    property = hyphenateProperty(property) as StyleProperty;
    if (value === undefined) {
      continue;
    }
    if (value.local ?? value.nextSource?.value ?? value.previousSource?.value) {
      sourceStyles.set(property, value.value);
      continue;
    }
    if (value.preset) {
      presetStyles.set(property, value.value);
      continue;
    }
    if (value.cascaded?.value) {
      cascadedStyles.set(property, value.value);
      continue;
    }
    if (value.inherited?.value) {
      inheritedStyles.set(property, value.value);
      continue;
    }
    if (value.value) {
      // Doesn't need handling
      continue;
    }
    captureError(new Error("Unknown style source"), value);
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
  add("Inherited", inheritedStyles);
  add("Preset", presetStyles);

  return result.join("\n");
};

const useHighlightedCss = () => {
  const currentStyle = useStyleInfo();

  return useMemo(() => {
    if (Object.keys(currentStyle).length === 0) {
      return;
    }
    const cssText = getCssText(currentStyle);
    return Prism.highlight(cssText, Prism.languages.css, "css");
  }, [currentStyle]);
};

export const CssPreview = () => {
  const code = useHighlightedCss();

  if (code === undefined) {
    return null;
  }

  return (
    <CollapsibleSection label="CSS Preview" fullWidth>
      <ScrollArea css={{ px: theme.spacing[9] }}>
        <pre tabIndex={0} className={preStyle()}>
          <div
            className="language-css"
            style={{ whiteSpace: "break-spaces" }}
            dangerouslySetInnerHTML={{ __html: code }}
          ></div>
        </pre>
      </ScrollArea>
    </CollapsibleSection>
  );
};
