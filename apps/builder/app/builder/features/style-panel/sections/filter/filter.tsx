import { CollapsibleSectionRoot } from "~/builder/shared/collapsible-section";
import type { SectionProps } from "../shared/section";
import { useState } from "react";
import {
  Flex,
  SectionTitle,
  SectionTitleButton,
  SectionTitleLabel,
  Tooltip,
  Text,
} from "@webstudio-is/design-system";
import { getDots } from "../../shared/collapsible-section";
import { PropertyName } from "../../shared/property-name";
import { InfoCircleIcon, PlusIcon } from "@webstudio-is/icons";
import { type StyleProperty } from "@webstudio-is/css-engine";
import { getStyleSource } from "../../shared/style-info";
import { LayersList } from "../../style-layers-list";
import { addLayer } from "../../style-layer-utils";
import { parseFilter } from "@webstudio-is/css-data";
import { FilterSectionContent } from "../../shared/filter-content";

export const properties = ["filter"] satisfies Array<StyleProperty>;

const property: StyleProperty = properties[0];
const label = "Filters";
const initialFilter = "blur(0px)";

export const Section = (props: SectionProps) => {
  const { currentStyle, deleteProperty } = props;
  const [isOpen, setIsOpen] = useState(true);
  const value = currentStyle[property]?.value;
  const sectionStyleSource =
    value?.type === "unparsed" || value?.type === "guaranteedInvalid"
      ? undefined
      : getStyleSource(currentStyle[property]);

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
                    parseFilter(initialFilter),
                    currentStyle,
                    props.createBatchUpdate
                  );
                  setIsOpen(true);
                }}
              />
            </Tooltip>
          }
        >
          <PropertyName
            title={label}
            style={currentStyle}
            properties={properties}
            description="Filter effects allow you to apply graphical effects like blurring, color shifting, and more to elements."
            label={
              <SectionTitleLabel color={sectionStyleSource}>
                {label}
              </SectionTitleLabel>
            }
            onReset={() => deleteProperty(property)}
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
