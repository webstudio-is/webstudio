import { Flex } from "@webstudio-is/design-system";
import type { StyleProperty } from "@webstudio-is/css-engine";
import type { SectionProps } from "../shared/section";
import { CollapsibleSection } from "../../shared/collapsible-section";
import {
  BorderRadius,
  properties as borderRadiusProperties,
} from "./border-radius";
import {
  BorderStyle,
  properties as borderStyleProperties,
} from "./border-style";
import {
  BorderWidth,
  properties as borderWidthProperties,
} from "./border-width";
import {
  BorderColor,
  properties as borderColorProperties,
} from "./border-color";

export const properties = [
  ...borderColorProperties,
  ...borderRadiusProperties,
  ...borderStyleProperties,
  ...borderWidthProperties,
] satisfies Array<StyleProperty>;

export const Section = (props: SectionProps) => {
  return (
    <CollapsibleSection
      label="Borders"
      currentStyle={props.currentStyle}
      properties={properties}
    >
      <Flex direction="column" gap={2}>
        <BorderStyle {...props} />
        <BorderColor {...props} />
        <BorderWidth {...props} />
        <BorderRadius {...props} />
      </Flex>
    </CollapsibleSection>
  );
};
