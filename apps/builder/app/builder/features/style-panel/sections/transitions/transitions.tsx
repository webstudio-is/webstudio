import type { StyleProperty } from "@webstudio-is/css-engine";
import { CollapsibleSectionBase } from "~/builder/shared/collapsible-section";
import type { RenderCategoryProps } from "../../style-sections";
import {
  SectionTitle,
  SectionTitleButton,
  SectionTitleLabel,
} from "@webstudio-is/design-system";
import { useState } from "react";
import { getDots } from "../../shared/collapsible-section";
import { getStyleSource } from "../../shared/style-info";
import { PlusIcon } from "@webstudio-is/icons";
import { PropertyName } from "../../shared/property-name";
import { addTransition, property } from "./transition-utils";

const properties: StyleProperty[] = ["transition"];
const label = "Transitions";

export const TransitionSection = (props: RenderCategoryProps) => {
  const { currentStyle, deleteProperty } = props;
  const layersStyleSource = getStyleSource(currentStyle[property]);
  const [isOpen, setIsOpen] = useState(true);
  const value = currentStyle[property]?.value;

  return (
    <CollapsibleSectionBase
      label={label}
      isOpen={isOpen}
      onOpenChange={setIsOpen}
      trigger={
        <SectionTitle
          dots={getDots(currentStyle, properties)}
          suffix={
            <SectionTitleButton
              prefix={<PlusIcon />}
              onClick={() => {
                addTransition(
                  // Using default transition value
                  "ease 0s",
                  currentStyle,
                  props.createBatchUpdate
                );
                setIsOpen(true);
              }}
            />
          }
        >
          <PropertyName
            title={label}
            style={currentStyle}
            properties={properties}
            label={
              <SectionTitleLabel color={layersStyleSource}>
                {label}
              </SectionTitleLabel>
            }
            onReset={() => deleteProperty(property)}
          />
        </SectionTitle>
      }
    >
      {value?.type === "layers" && value.value.length > 0 && (
        <div>Has layers</div>
      )}
    </CollapsibleSectionBase>
  );
};
