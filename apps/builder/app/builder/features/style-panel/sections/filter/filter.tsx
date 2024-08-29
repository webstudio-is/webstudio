import { CollapsibleSectionRoot } from "~/builder/shared/collapsible-section";
import type { SectionProps } from "../shared/section";
import { useState } from "react";
import {
  Flex,
  SectionTitle,
  SectionTitleButton,
  Tooltip,
  Text,
} from "@webstudio-is/design-system";
import { parseCssValue } from "@webstudio-is/css-data";
import { getDots } from "../../shared/collapsible-section";
import { InfoCircleIcon, PlusIcon } from "@webstudio-is/icons";
import { LayersValue, type StyleProperty } from "@webstudio-is/css-engine";
import { LayersList } from "../../style-layers-list";
import { addLayer } from "../../style-layer-utils";
import { FilterSectionContent } from "../../shared/filter-content";
import { PropertySectionLabel } from "../../property-label";

export const properties = ["filter"] satisfies [
  StyleProperty,
  ...StyleProperty[],
];

const property: StyleProperty = properties[0];
const label = "Filters";
const initialFilter = "blur(0px)";

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
            <Tooltip content={"Add a filter"}>
              <SectionTitleButton
                prefix={<PlusIcon />}
                onClick={() => {
                  addLayer(
                    property,
                    parseCssValue(property, initialFilter) as LayersValue,
                    currentStyle,
                    props.createBatchUpdate
                  );
                  setIsOpen(true);
                }}
              />
            </Tooltip>
          }
        >
          <PropertySectionLabel
            label={label}
            description="Filter effects allow you to apply graphical effects like blurring, color shifting, and more to elements."
            properties={properties}
          />
        </SectionTitle>
      }
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
    </CollapsibleSectionRoot>
  );
};
