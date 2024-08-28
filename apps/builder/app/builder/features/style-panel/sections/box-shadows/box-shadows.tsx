import {
  SectionTitle,
  SectionTitleButton,
  Tooltip,
  Text,
} from "@webstudio-is/design-system";
import { InfoCircleIcon, PlusIcon } from "@webstudio-is/icons";
import type { LayersValue, StyleProperty } from "@webstudio-is/css-engine";
import { CollapsibleSectionRoot } from "~/builder/shared/collapsible-section";
import { useState } from "react";
import { getDots } from "../../shared/collapsible-section";
import type { SectionProps } from "../shared/section";
import { LayersList } from "../../style-layers-list";
import { addLayer } from "../../style-layer-utils";
import { parseCssValue } from "@webstudio-is/css-data";
import { ShadowContent } from "../../shared/shadow-content";
import { PropertySectionLabel } from "../../property-label";

export const properties = ["boxShadow"] satisfies [
  StyleProperty,
  ...StyleProperty[],
];

const property: StyleProperty = properties[0];
const label = "Box Shadows";
const initialBoxShadow = "0px 2px 5px 0px rgba(0, 0, 0, 0.2)";

export const Section = (props: SectionProps) => {
  const { currentStyle, deleteProperty } = props;
  const [isOpen, setIsOpen] = useState(true);
  const value = currentStyle[property]?.value;

  return (
    <CollapsibleSectionRoot
      fullWidth
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
                addLayer(
                  property,
                  parseCssValue(property, initialBoxShadow) as LayersValue,
                  currentStyle,
                  props.createBatchUpdate
                );
                setIsOpen(true);
              }}
            />
          }
        >
          <PropertySectionLabel
            label={label}
            description="Adds shadow effects around an element's frame."
            properties={properties}
          />
        </SectionTitle>
      }
    >
      {value?.type === "layers" && value.value.length > 0 && (
        <LayersList
          {...props}
          property={property}
          value={value}
          label={label}
          deleteProperty={deleteProperty}
          renderContent={(layerProps) => {
            if (layerProps.layer.type !== "tuple") {
              return <></>;
            }

            return (
              <ShadowContent
                {...layerProps}
                layer={layerProps.layer}
                property={property}
                tooltip={
                  <Tooltip
                    variant="wrapped"
                    content={
                      <Text>
                        Paste a box-shadow CSS code without the property name,
                        for example:
                        <br /> <br />
                        <Text variant="monoBold">{initialBoxShadow}</Text>
                      </Text>
                    }
                  >
                    <InfoCircleIcon />
                  </Tooltip>
                }
              />
            );
          }}
        />
      )}
    </CollapsibleSectionRoot>
  );
};
