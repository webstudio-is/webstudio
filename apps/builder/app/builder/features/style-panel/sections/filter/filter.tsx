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
import {
  FunctionValue,
  TupleValue,
  type StyleProperty,
} from "@webstudio-is/css-engine";
import { getStyleSource } from "../../shared/style-info";
import { LayersList } from "../../style-layers-list";
import { FilterLayer } from "./filter-layer";
import { addLayer } from "../../style-layer-utils";
import { parseFilter } from "@webstudio-is/css-data";

export const properties = ["filter"] satisfies Array<StyleProperty>;

const property: StyleProperty = properties[0];
const label = "Filters";
const INITIAL_FILTER = "blur(0px)";

export const Section = (props: SectionProps) => {
  const { currentStyle, deleteProperty } = props;
  const [isOpen, setIsOpen] = useState(true);
  const layerStyleSource = getStyleSource(currentStyle[property]);
  const value = currentStyle[property]?.value;

  return (
    <CollapsibleSectionRoot
      fullWidth
      label={label}
      isOpen={isOpen}
      onOpenChange={setIsOpen}
      trigger={
        <SectionTitle
          dots={getDots(currentStyle, [property])}
          suffix={
            <Tooltip content={"Add a filter"}>
              <SectionTitleButton
                prefix={<PlusIcon />}
                onClick={() => {
                  addLayer(
                    property,
                    parseFilter(INITIAL_FILTER),
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
              <SectionTitleLabel color={layerStyleSource}>
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
                  content={
                    <Flex gap="2" direction="column">
                      <Text variant="regularBold">{label}</Text>
                      <Text variant="monoBold">filter</Text>
                      <Text>
                        Applies graphical effects like
                        <br />
                        blur or color shift to an element
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
