import type { SectionProps } from "../shared/section";
import { Flex, Tooltip, Text } from "@webstudio-is/design-system";
import { parseCssValue } from "@webstudio-is/css-data";
import { RepeatedStyleSection } from "../../shared/style-section";
import { InfoCircleIcon } from "@webstudio-is/icons";
import { LayersValue, type StyleProperty } from "@webstudio-is/css-engine";
import { LayersList } from "../../style-layers-list";
import { addLayer } from "../../style-layer-utils";
import { FilterSectionContent } from "../../shared/filter-content";

export const properties = ["filter"] satisfies [
  StyleProperty,
  ...StyleProperty[],
];

const property: StyleProperty = properties[0];
const label = "Filters";
const initialFilter = "blur(0px)";

export const Section = (props: SectionProps) => {
  const { currentStyle, deleteProperty } = props;
  const value = currentStyle[property]?.value;

  return (
    <RepeatedStyleSection
      label={label}
      description="Filter effects allow you to apply graphical effects like blurring, color shifting, and more to elements."
      properties={properties}
      onAdd={() => {
        addLayer(
          property,
          parseCssValue(property, initialFilter) as LayersValue,
          currentStyle,
          props.createBatchUpdate
        );
      }}
    >
      {value?.type === "tuple" && value.value.length > 0 && (
        <LayersList
          {...props}
          property={property}
          value={value}
          label={label}
          deleteProperty={deleteProperty}
          renderContent={(layerProps) => {
            if (layerProps.layer.type !== "function") {
              return <></>;
            }

            return (
              <FilterSectionContent
                {...layerProps}
                property={property}
                layer={layerProps.layer}
                tooltip={
                  <Tooltip
                    variant="wrapped"
                    content={
                      <Flex gap="2" direction="column">
                        <Text variant="regularBold">{label}</Text>
                        <Text variant="monoBold">filter</Text>
                        <Text>
                          Applies graphical effects like blur or color shift to
                          an element, for example:
                          <br /> <br />
                          <Text variant="mono">{initialFilter}</Text>
                        </Text>
                      </Flex>
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
