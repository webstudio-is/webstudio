import { CollapsibleSectionRoot } from "~/builder/shared/collapsible-section";
import type { SectionProps } from "../shared/section";
import type { LayersValue, StyleProperty } from "@webstudio-is/css-engine";
import { useState } from "react";
import {
  SectionTitle,
  SectionTitleButton,
  Tooltip,
  Text,
} from "@webstudio-is/design-system";
import { InfoCircleIcon, PlusIcon } from "@webstudio-is/icons";
import { addLayer } from "../../style-layer-utils";
import { parseCssValue } from "@webstudio-is/css-data";
import { getDots } from "../../shared/collapsible-section";
import { LayersList } from "../../style-layers-list";
import { ShadowContent } from "../../shared/shadow-content";
import { PropertySectionLabel } from "../../property-label";

export const properties = ["textShadow"] satisfies [
  StyleProperty,
  ...StyleProperty[],
];

const property: StyleProperty = properties[0];
const label = "Text Shadows";
const initialTextShadow = "0px 2px 5px rgba(0, 0, 0, 0.2)";

export const Section = (props: SectionProps) => {
  const { currentStyle, createBatchUpdate, deleteProperty } = props;
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
                  parseCssValue(property, initialTextShadow) as LayersValue,
                  currentStyle,
                  createBatchUpdate
                );
                setIsOpen(true);
              }}
            />
          }
        >
          <PropertySectionLabel
            label={label}
            description="Adds shadow effects around a text."
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
                        Paste a text-shadow CSS code without the property name,
                        for example:
                        <br /> <br />
                        <Text variant="monoBold">{initialTextShadow}</Text>
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
