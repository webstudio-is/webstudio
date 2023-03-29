import type { StyleProperty } from "@webstudio-is/css-data";
import type { RenderCategoryProps } from "../../style-sections";
import { renderProperty } from "../../style-sections";
import { CollapsibleSection } from "../../shared/collapsible-section";

const properties: StyleProperty[] = [
  "position",
  "top",
  "right",
  "bottom",
  "left",
  "zIndex",
  "float",
  "clear",
];

export const PositionSection = (props: RenderCategoryProps) => (
  <CollapsibleSection
    label={props.label}
    isOpen={props.isOpen}
    sources={props.sources}
  >
    {properties.map((property) => renderProperty({ ...props, property }))}
  </CollapsibleSection>
);
