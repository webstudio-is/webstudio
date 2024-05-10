import type {
  LayersValue,
  StyleProperty,
  TupleValue,
} from "@webstudio-is/css-engine";
import { CollapsibleSectionRoot } from "~/builder/shared/collapsible-section";
import type { SectionProps } from "../shared/section";
import {
  SectionTitle,
  SectionTitleButton,
  SectionTitleLabel,
  Tooltip,
} from "@webstudio-is/design-system";
import { useState } from "react";
import { getDots } from "../../shared/collapsible-section";
import { getStyleSource } from "../../shared/style-info";
import { PlusIcon } from "@webstudio-is/icons";
import { PropertyName } from "../../shared/property-name";
import { addLayer } from "../../style-layer-utils";
import { parseTransition } from "@webstudio-is/css-data";
import { LayersList } from "../../style-layers-list";
import { TransitionLayer } from "./transition-layer";
import { $selectedOrLastStyleSourceSelector } from "~/shared/nano-states";
import { useStore } from "@nanostores/react";

export const properties = ["transition"] satisfies Array<StyleProperty>;

const property: StyleProperty = properties[0];
const label = "Transitions";
const INITIAL_TRANSITION = "opacity 200ms ease";

export const Section = (props: SectionProps) => {
  const { currentStyle, deleteProperty } = props;
  const [isOpen, setIsOpen] = useState(true);
  const value = currentStyle[property]?.value;
  const sectionStyleSource =
    value?.type === "unparsed" || value?.type === "guaranteedInvalid"
      ? undefined
      : getStyleSource(currentStyle[property]);

  const selectedOrLastStyleSourceSelector = useStore(
    $selectedOrLastStyleSourceSelector
  );

  const isStyleInLocalState =
    selectedOrLastStyleSourceSelector &&
    selectedOrLastStyleSourceSelector.state === undefined;

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
            <Tooltip
              content={
                isStyleInLocalState === false
                  ? "Transitions can only be added in local state"
                  : "Add a transition"
              }
            >
              <SectionTitleButton
                disabled={isStyleInLocalState === false}
                prefix={<PlusIcon />}
                onClick={() => {
                  addLayer(
                    property,
                    parseTransition(INITIAL_TRANSITION),
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
            description="Animate the transition between states on this instance."
            properties={properties}
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
      {value?.type === "layers" && value.value.length > 0 && (
        <LayersList<TupleValue, LayersValue>
          property={property}
          layers={value}
          {...props}
          renderLayer={(layerProps) => {
            return (
              <TransitionLayer
                {...layerProps}
                key={layerProps.index}
                layer={layerProps.layer}
                disabled={isStyleInLocalState === false}
              />
            );
          }}
        />
      )}
    </CollapsibleSectionRoot>
  );
};
