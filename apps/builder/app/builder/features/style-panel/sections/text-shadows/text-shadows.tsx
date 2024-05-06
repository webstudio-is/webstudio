import { CollapsibleSectionRoot } from "~/builder/shared/collapsible-section";
import type { SectionProps } from "../shared/section";
import type {
  LayersValue,
  StyleProperty,
  TupleValue,
} from "@webstudio-is/css-engine";
import { useState } from "react";
import {
  SectionTitle,
  SectionTitleButton,
  SectionTitleLabel,
} from "@webstudio-is/design-system";
import { PlusIcon } from "@webstudio-is/icons";
import { addLayer } from "../../style-layer-utils";
import { parseShadow } from "@webstudio-is/css-data";
import { getDots } from "../../shared/collapsible-section";
import { PropertyName } from "../../shared/property-name";
import { getStyleSource } from "../../shared/style-info";
import { LayersList } from "../../style-layers-list";
import { ShadowLayer } from "../../shared/shadow-layer";

export const properties = ["textShadow"] satisfies Array<StyleProperty>;

const property: StyleProperty = properties[0];
const label = "Text Shadows";
const INITIAL_TEXT_SHADOW = "0px 2px 5px rgba(0, 0, 0, 0.2)";

export const Section = (props: SectionProps) => {
  const { currentStyle, createBatchUpdate, deleteProperty } = props;
  const [isOpen, setIsOpen] = useState(false);
  const layersStyleSource = getStyleSource(currentStyle[property]);
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
                  parseShadow("textShadow", INITIAL_TEXT_SHADOW),
                  currentStyle,
                  createBatchUpdate
                );
                setIsOpen(true);
              }}
            />
          }
        >
          <PropertyName
            title={label}
            style={currentStyle}
            properties={properties}
            description="Adds shadow effects around a text."
            label={
              <SectionTitleLabel color={layersStyleSource}>
                {label}
              </SectionTitleLabel>
            }
            onReset={() => deleteProperty(property)}
          />
        </SectionTitle>
      }
    >
      {value?.type === "layers" && value.value.length > 0 && (
        <LayersList<TupleValue, LayersValue>
          property={property}
          layers={value}
          {...props}
          renderLayer={(layersProps) => (
            <ShadowLayer
              {...layersProps}
              key={layersProps.index}
              label={label}
            ></ShadowLayer>
          )}
        />
      )}
    </CollapsibleSectionRoot>
  );
};
