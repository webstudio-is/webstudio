import type { StyleProperty } from "@webstudio-is/css-data";
import type { RenderCategoryProps } from "../../style-sections";
import { renderProperty } from "../../style-sections";
import { CollapsibleSection } from "../../shared/collapsible-section";

const properties: StyleProperty[] = [
  "resize",
  "clip",
  "visibility",
  "boxSizing",
  "content",
  "quotes",
  "counterReset",
  "counterIncrement",
  "inlineSize",
  "blockSize",
  "minInlineSize",
  "minBlockSize",
  "maxInlineSize",
  "maxBlockSize",
  "userSelect",
  "pointerEvents",
];

export const OtherSection = (props: RenderCategoryProps) => (
  <CollapsibleSection
    label="Other"
    currentStyle={props.currentStyle}
    properties={properties}
  >
    {properties.map((property) => renderProperty({ ...props, property }))}
  </CollapsibleSection>
);
