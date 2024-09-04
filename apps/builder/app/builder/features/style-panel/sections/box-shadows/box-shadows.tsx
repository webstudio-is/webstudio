import { Tooltip, Text } from "@webstudio-is/design-system";
import { InfoCircleIcon } from "@webstudio-is/icons";
import type { LayersValue, StyleProperty } from "@webstudio-is/css-engine";
import { RepeatedStyleSection } from "../../shared/style-section";
import type { SectionProps } from "../shared/section";
import { LayersList } from "../../style-layers-list";
import { addLayer } from "../../style-layer-utils";
import { parseCssValue } from "@webstudio-is/css-data";
import { ShadowContent } from "../../shared/shadow-content";

export const properties = ["boxShadow"] satisfies [
  StyleProperty,
  ...StyleProperty[],
];

const property: StyleProperty = properties[0];
const label = "Box Shadows";
const initialBoxShadow = "0px 2px 5px 0px rgba(0, 0, 0, 0.2)";

export const Section = (props: SectionProps) => {
  const { currentStyle, deleteProperty } = props;
  const value = currentStyle[property]?.value;

  return (
    <RepeatedStyleSection
      label={label}
      description="Adds shadow effects around an element's frame."
      properties={properties}
      onAdd={() => {
        addLayer(
          property,
          parseCssValue(property, initialBoxShadow) as LayersValue,
          currentStyle,
          props.createBatchUpdate
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
    </RepeatedStyleSection>
  );
};
