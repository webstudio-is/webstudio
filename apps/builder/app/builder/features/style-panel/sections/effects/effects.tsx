import type { StyleProperty } from "@webstudio-is/css-data";
import type { RenderCategoryProps } from "../../style-sections";
import { ShowMore } from "../../shared/show-more";
import { renderProperty } from "../../style-sections";
import { CollapsibleSection } from "../../shared/collapsible-section";

const properties: StyleProperty[] = [
  "mixBlendMode",
  "opacity",
  "outlineColor",
  "outlineOffset",
  "outlineStyle",
  "outlineWidth",
  "boxShadow",
  "transform",
  "filter",
  "backdropFilter",
  "cursor",
];

const moreProperties: StyleProperty[] = [
  "animationDelay",
  "animationDirection",
  "animationDuration",
  "animationFillMode",
  "animationIterationCount",
  "animationName",
  "animationPlayState",
  "animationTimingFunction",
  "transitionDelay",
  "transitionDuration",
  "transitionProperty",
  "transitionTimingFunction",
];

const allProperties = [...properties, ...moreProperties];

export const EffectsSection = (props: RenderCategoryProps) => (
  <CollapsibleSection
    label="Effects"
    currentStyle={props.currentStyle}
    properties={allProperties}
  >
    {properties.map((property) => renderProperty({ ...props, property }))}
    <ShowMore
      styleConfigs={moreProperties.map((property) =>
        renderProperty({ ...props, property })
      )}
    />
  </CollapsibleSection>
);
