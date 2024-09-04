import type { SectionProps } from "../shared/section";
import type { LayersValue, StyleProperty } from "@webstudio-is/css-engine";
import { Tooltip, Text } from "@webstudio-is/design-system";
import { InfoCircleIcon } from "@webstudio-is/icons";
import { addLayer } from "../../style-layer-utils";
import { parseCssValue } from "@webstudio-is/css-data";
import { RepeatedStyleSection } from "../../shared/style-section";
import { LayersList } from "../../style-layers-list";
import { ShadowContent } from "../../shared/shadow-content";

export const properties = ["textShadow"] satisfies [
  StyleProperty,
  ...StyleProperty[],
];

const property: StyleProperty = properties[0];
const label = "Text Shadows";
const initialTextShadow = "0px 2px 5px rgba(0, 0, 0, 0.2)";

export const Section = (props: SectionProps) => {
  const { currentStyle, createBatchUpdate, deleteProperty } = props;
  const value = currentStyle[property]?.value;

  return (
    <RepeatedStyleSection
      label={label}
      description="Adds shadow effects around a text."
      properties={properties}
      onAdd={() => {
        addLayer(
          property,
          parseCssValue(property, initialTextShadow) as LayersValue,
          currentStyle,
          createBatchUpdate
        );
      }}
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
    </RepeatedStyleSection>
  );
};
