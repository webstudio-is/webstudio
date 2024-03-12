import { CollapsibleSectionBase } from "~/builder/shared/collapsible-section";
import type { RenderCategoryProps } from "../../style-sections";
import { useState } from "react";
import {
  SectionTitle,
  SectionTitleButton,
  SectionTitleLabel,
  Tooltip,
} from "@webstudio-is/design-system";
import { getDots } from "../../shared/collapsible-section";
import { PropertyName } from "../../shared/property-name";
import { PlusIcon } from "@webstudio-is/icons";
import { FunctionValue, type StyleProperty } from "@webstudio-is/css-engine";
import { getStyleSource } from "../../shared/style-info";
import { LayersList } from "../../style-layers-list";
import { FilterLayer } from "./filter-layer";
import { addLayer } from "../../style-layer-utils";
import { parseFilter } from "@webstudio-is/css-data";

const property: StyleProperty = "filter";
const label = "Filters";
const INITIAL_FILTER = "blur(0px)";

export const FilterSection = (props: RenderCategoryProps) => {
  const { currentStyle, deleteProperty } = props;
  const [isOpen, setIsOpen] = useState(true);
  const layerStyleSource = getStyleSource(currentStyle[property]);
  const value = currentStyle[property]?.value;

  return (
    <CollapsibleSectionBase
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
            properties={[property]}
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
      {value?.type === "layers" && value.value.length > 0 && (
        <LayersList<FunctionValue>
          {...props}
          property={property}
          layers={value}
          renderLayer={(layerProps) => (
            <FilterLayer {...layerProps} key={layerProps.index} />
          )}
        />
      )}
    </CollapsibleSectionBase>
  );
};
