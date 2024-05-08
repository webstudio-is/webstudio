import { CollapsibleSectionRoot } from "~/builder/shared/collapsible-section";
import type { SectionProps } from "../shared/section";
import type {
  FunctionValue,
  StyleProperty,
  TupleValue,
} from "@webstudio-is/css-engine";
import { useState } from "react";
import {
  SectionTitle,
  SectionTitleButton,
  SectionTitleLabel,
  Tooltip,
  Flex,
  Text,
} from "@webstudio-is/design-system";
import { PropertyName } from "../../shared/property-name";
import { getStyleSource } from "../../shared/style-info";
import { getDots } from "../../shared/collapsible-section";
import { InfoCircleIcon, PlusIcon } from "@webstudio-is/icons";
import { addLayer } from "../../style-layer-utils";
import { parseFilter } from "@webstudio-is/css-data";
import { LayersList } from "../../style-layers-list";
import { FilterLayer } from "../filter/filter-layer";

export const properties = ["backdropFilter"] satisfies Array<StyleProperty>;

const property: StyleProperty = properties[0];
const label = "Backdrop Filters";
const INITIAL_BACKDROP_FILTER = "blur(0px)";

export const Section = (props: SectionProps) => {
  const { currentStyle, deleteProperty } = props;
  const [isOpen, setIsOpen] = useState(false);
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
            <Tooltip content={"Add a backdrop-filter"}>
              <SectionTitleButton
                prefix={<PlusIcon />}
                onClick={() => {
                  addLayer(
                    property,
                    parseFilter(INITIAL_BACKDROP_FILTER),
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
            description="Backdrop filters are similar to filters, but are applied to the area behind an element. This can be useful for creating frosted glass effects."
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
        <LayersList<FunctionValue, TupleValue>
          {...props}
          property={property}
          layers={value}
          renderLayer={(layerProps) => (
            <FilterLayer
              {...layerProps}
              key={layerProps.index}
              label={label}
              tooltip={
                <Tooltip
                  css={{ width: "208px" }}
                  content={
                    <Flex gap="2" direction="column">
                      <Text variant="regularBold">{label}</Text>
                      <Text variant="monoBold">backdrop-filter</Text>
                      <Text>
                        Applies graphical effects like blur or color shift to
                        the area behind an element
                      </Text>
                    </Flex>
                  }
                >
                  <InfoCircleIcon />
                </Tooltip>
              }
            />
          )}
        />
      )}
    </CollapsibleSectionRoot>
  );
};
