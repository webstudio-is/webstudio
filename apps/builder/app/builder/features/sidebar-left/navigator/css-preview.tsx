import {
  ScrollArea,
  css,
  textVariants,
  theme,
} from "@webstudio-is/design-system";
import { useInstanceStyleData } from "../../style-panel/shared/style-info";
import { selectedInstanceSelectorStore } from "~/shared/nano-states";
import { useStore } from "@nanostores/react";
import { createCssEngine } from "@webstudio-is/css-engine";
import { CollapsibleSection } from "~/builder/shared/collapsible-section";
import { useMemo } from "react";
import * as Prism from "prismjs";

const preStyle = css(textVariants.mono, {
  margin: 0,
  height: theme.spacing[24],
  userSelect: "text",
  cursor: "text",
});

const useHighlightedCss = () => {
  const selectedInstanceSelector = useStore(selectedInstanceSelectorStore);
  const style = useInstanceStyleData(selectedInstanceSelector);
  return useMemo(() => {
    if (Object.keys(style).length === 0) {
      return;
    }
    const cssEngine = createCssEngine();
    const rule = cssEngine.addStyleRule("instance", { style });
    const cssText = rule.styleMap.toString();
    return Prism.highlight(cssText, Prism.languages.css, "css");
  }, [style]);
};

export const CssPreview = () => {
  const code = useHighlightedCss();

  if (code === undefined) {
    return null;
  }

  return (
    <CollapsibleSection label="CSS Preview" fullWidth>
      <ScrollArea verticalOnly={false} css={{ px: theme.spacing[9] }}>
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
