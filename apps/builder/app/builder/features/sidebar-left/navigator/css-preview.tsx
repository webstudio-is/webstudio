import {
  ScrollArea,
  css,
  textVariants,
  theme,
} from "@webstudio-is/design-system";
import {
  type StyleInfo,
  useStyleInfo,
} from "../../style-panel/shared/style-info";
import { createCssEngine } from "@webstudio-is/css-engine";
import { CollapsibleSection } from "~/builder/shared/collapsible-section";
import { useMemo } from "react";
import * as Prism from "prismjs";
import type { Style, StyleProperty } from "@webstudio-is/css-data";

const preStyle = css(textVariants.mono, {
  margin: 0,
  height: theme.spacing[24],
  userSelect: "text",
  cursor: "text",
});

const getCssText = (instanceStyle: StyleInfo) => {
  const cssEngine = createCssEngine();
  const style: Style = {};
  let property: StyleProperty;
  for (property in instanceStyle) {
    const value = instanceStyle[property];

    if (value) {
      const userDefinedStyle: Style | undefined =
        value.local ??
        value.nextSource?.value ??
        value.previousSource?.value ??
        value.cascaded?.value ??
        value.preset ??
        value.inherited?.value;

      if (userDefinedStyle === undefined) {
        continue;
      }

      style[property] = value.value;
    }
  }
  const rule = cssEngine.addStyleRule("instance", {
    style,
  });
  return rule.styleMap.toString();
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
          <code
            className="language-css"
            style={{ whiteSpace: "break-spaces" }}
            dangerouslySetInnerHTML={{ __html: code }}
          ></code>
        </pre>
      </ScrollArea>
    </CollapsibleSection>
  );
};
