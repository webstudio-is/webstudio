import {
  SectionTitle,
  SectionTitleButton,
  SectionTitleLabel,
} from "@webstudio-is/design-system";
import { PlusIcon } from "@webstudio-is/icons";
import { CollapsibleSectionBase } from "~/builder/shared/collapsible-section";
import { useState } from "react";
import { getDots } from "../../shared/collapsible-section";
import { PropertyName } from "../../shared/property-name";
import { getStyleSource } from "../../shared/style-info";
import type { RenderCategoryProps } from "../../style-sections";
import { BoxShadowLayers } from "./box-shadow-layers";
import { addBoxShadow, property } from "./utils";
import { parseBoxShadow } from "@webstudio-is/css-data";

const label = "Box Shadow";

export const BoxShadows = (props: RenderCategoryProps) => {
  const { currentStyle, deleteProperty } = props;
  const [isOpen, setIsOpen] = useState(true);
  const layersStyleSource = getStyleSource(currentStyle[property]);
  const value = currentStyle[property]?.value;

  return (
    <CollapsibleSectionBase
      fullWidth
      label={label}
      isOpen={isOpen}
      onOpenChange={setIsOpen}
      trigger={
        <SectionTitle
          dots={getDots(currentStyle, [property])}
          suffix={
            <SectionTitleButton
              prefix={<PlusIcon />}
              onClick={() => {
                const layers = parseBoxShadow(
                  "0px 2px 5px 0px rgba(0, 0, 0, 0.2)"
                );
                // Will never be invalid.
                if (layers.type === "invalid") {
                  return;
                }

                if (value?.type === "layers") {
                  // Adding layers we had before
                  layers.value = [...layers.value, ...value.value];
                }
                addBoxShadow(layers, props.createBatchUpdate);
                setIsOpen(true);
              }}
            />
          }
        >
          <PropertyName
            style={currentStyle}
            properties={[property]}
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
        <BoxShadowLayers layers={value} {...props} />
      )}
    </CollapsibleSectionBase>
  );
};
