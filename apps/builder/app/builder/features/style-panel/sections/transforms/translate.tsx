import { CssValueListItem, Label } from "@webstudio-is/design-system";
import { toValue, type StyleProperty } from "@webstudio-is/css-engine";
import { useMemo } from "react";
import type { TransformPropertySectionProps } from "./utils";
import { FloatingPanel } from "~/builder/shared/floating-panel";
import { TransformPanelContent } from "./transfor-panel";

const property: StyleProperty = "translate";

export const Translate = (props: TransformPropertySectionProps) => {
  const { currentStyle } = props;
  const value = currentStyle[property]?.value;
  const label = useMemo(() => `Translate: ${toValue(value)}`, [value]);

  if (value?.type !== "tuple") {
    return;
  }

  return (
    <FloatingPanel
      title={props.panel}
      content={<TransformPanelContent panel={props.panel} value={value} />}
    >
      <CssValueListItem
        id={props.panel}
        index={props.index}
        label={<Label truncate>{label}</Label>}
      ></CssValueListItem>
    </FloatingPanel>
  );
};
