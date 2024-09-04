import type { SectionProps } from "../shared/section";
import type { LayersValue, StyleProperty } from "@webstudio-is/css-engine";
import { Tooltip, Flex, Text } from "@webstudio-is/design-system";
import { parseCssValue } from "@webstudio-is/css-data";
import { RepeatedStyleSection } from "../../shared/style-section";
import { InfoCircleIcon } from "@webstudio-is/icons";
import { addLayer } from "../../style-layer-utils";
import { LayersList } from "../../style-layers-list";
import { FilterSectionContent } from "../../shared/filter-content";

export const properties = ["backdropFilter"] satisfies [
  StyleProperty,
  ...StyleProperty[],
];

const property: StyleProperty = properties[0];
const label = "Backdrop Filters";
const initialBackdropFilter = "blur(0px)";

export const Section = (props: SectionProps) => {
  const { currentStyle, deleteProperty } = props;
  const value = currentStyle[property]?.value;

  return (
    <RepeatedStyleSection
      label={label}
      description="Backdrop filters are similar to filters, but are applied to the area behind an element. This can be useful for creating frosted glass effects."
      properties={properties}
      onAdd={() => {
        addLayer(
          property,
          parseCssValue(property, initialBackdropFilter) as LayersValue,
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
                        <Text variant="monoBold">backdrop-filter</Text>
                        <Text>
                          Applies graphical effects like blur or color shift to
                          the area behind an element
                          <br /> <br />
                          <Text variant="mono">{initialBackdropFilter}</Text>
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
