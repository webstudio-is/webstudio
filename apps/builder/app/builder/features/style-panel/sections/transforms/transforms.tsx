import { CollapsibleSectionRoot } from "~/builder/shared/collapsible-section";
import type { SectionProps } from "../shared/section";
import type { StyleProperty } from "@webstudio-is/css-engine";
import { useState } from "react";
import {
  CssValueListArrowFocus,
  CssValueListItem,
  Label,
  SectionTitle,
  SectionTitleButton,
  SectionTitleLabel,
} from "@webstudio-is/design-system";
import { PlusIcon } from "@webstudio-is/icons";
import {
  addDefaultsForTransormSection,
  useTransformPropertyValues,
} from "./utils";
import { FloatingPanel } from "~/builder/shared/floating-panel";
import { TransformPanelContent } from "./transform-panel";
import { isFeatureEnabled } from "@webstudio-is/feature-flags";

export const transformPanels = [
  "translate",
  "scale",
  "rotate",
  "skew",
] as const;

export type TransformPanel = (typeof transformPanels)[number];

const label = "Transforms";
export const properties = [
  "translate",
  "scale",
  "transform",
] satisfies Array<StyleProperty>;

// @todo: How do we calculate the styleSource value for showing the blue-label.
// Should we consider one of the following properties or a common denominator of all the properties.

export const Section = (props: SectionProps) => {
  const [isOpen, setIsOpen] = useState(true);
  if (isFeatureEnabled("transforms") === false) {
    return;
  }

  return (
    <CollapsibleSectionRoot
      fullWidth
      label={label}
      isOpen={isOpen}
      onOpenChange={setIsOpen}
      trigger={
        <SectionTitle
          suffix={
            <SectionTitleButton
              prefix={<PlusIcon />}
              onClick={() => {
                addDefaultsForTransormSection({
                  createBatchUpdate: props.createBatchUpdate,
                });
              }}
            />
          }
        >
          <SectionTitleLabel>{label}</SectionTitleLabel>
        </SectionTitle>
      }
    >
      <CssValueListArrowFocus>
        {transformPanels.map((panel, index) => (
          <TransformSection
            {...props}
            key={panel}
            index={index}
            panel={panel}
          />
        ))}
      </CssValueListArrowFocus>
    </CollapsibleSectionRoot>
  );
};

const TransformSection = (
  props: SectionProps & { index: number; panel: TransformPanel }
) => {
  const { currentStyle, setProperty, panel, index } = props;
  const properties = useTransformPropertyValues({ currentStyle, panel });

  if (properties === undefined) {
    return;
  }

  return (
    <FloatingPanel
      title={label}
      content={
        <TransformPanelContent
          currentStyle={currentStyle}
          panel={panel}
          setProperty={setProperty}
        />
      }
    >
      <CssValueListItem
        id={label}
        index={index}
        label={<Label truncate>{properties.name}</Label>}
      ></CssValueListItem>
    </FloatingPanel>
  );
};
