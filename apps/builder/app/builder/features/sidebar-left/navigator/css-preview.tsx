import {
  ScrollArea,
  css,
  textVariants,
  theme,
} from "@webstudio-is/design-system";
import {
  type StyleInfo,
  useStyleInfo,
  type StyleValueInfo,
} from "../../style-panel/shared/style-info";
import { createCssEngine } from "@webstudio-is/css-engine";
import { CollapsibleSection } from "~/builder/shared/collapsible-section";
import { useMemo } from "react";
import * as Prism from "prismjs";
import type { Style, StyleProperty } from "@webstudio-is/css-data";
import { captureError } from "@webstudio-is/error-utils";

const preStyle = css(textVariants.mono, {
  margin: 0,
  height: theme.spacing[24],
  userSelect: "text",
  cursor: "text",
});

// - Compiles a CSS string from the style info
// - Groups by category and separates categories with comments
const getCssText = (instanceStyle: StyleInfo) => {
  const cssEngine = createCssEngine();
  type StyleValueInfoMap = Map<
    StyleProperty,
    StyleValueInfo[keyof StyleValueInfo]
  >;
  const sourceStyles: StyleValueInfoMap = new Map();
  const inheritedStyles: StyleValueInfoMap = new Map();
  const cascadedStyles: StyleValueInfoMap = new Map();
  const presetStyles: StyleValueInfoMap = new Map();

  // Aggregate styles by category so we can group them when rendering.
  let property: StyleProperty;
  for (property in instanceStyle) {
    const value = instanceStyle[property];
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

  const add = (comment: string, styles: StyleValueInfoMap) => {
    if (styles.size === 0) {
      return;
    }
    const rule = cssEngine.addStyleRule(comment, {
      style: Object.fromEntries(styles) as Style,
    });
    result.push(`/* ${comment} */`);
    result.push(rule.styleMap.toString());
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
