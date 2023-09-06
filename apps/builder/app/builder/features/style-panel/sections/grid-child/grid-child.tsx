import type { StyleProperty } from "@webstudio-is/css-engine";
import type { RenderCategoryProps } from "../../style-sections";
import { renderProperty } from "../../style-sections";
import { CollapsibleSection } from "../../shared/collapsible-section";

const properties: StyleProperty[] = [
  "gridRowEnd",
  "gridRowStart",
  "gridColumnStart",
  "gridColumnEnd",
  "alignSelf",
  "justifySelf",
  "order",
];

export const GridChildSection = (props: RenderCategoryProps) => (
  <CollapsibleSection
    label="Grid Child"
    currentStyle={props.currentStyle}
    properties={properties}
  >
    {properties.map((property) => renderProperty({ ...props, property }))}
  </CollapsibleSection>
);
