import type { StyleProperty, TupleValue } from "@webstudio-is/css-engine";
import { CollapsibleSectionBase } from "~/builder/shared/collapsible-section";
import type { RenderCategoryProps } from "../../style-sections";
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

const property: StyleProperty = "transition";
const label = "Transitions";
const INITIAL_TRANSITION = "opacity 200ms ease";

export const TransitionSection = (props: RenderCategoryProps) => {
  const { currentStyle, deleteProperty } = props;
  const [isOpen, setIsOpen] = useState(true);
  const layersStyleSource = getStyleSource(currentStyle[property]);
  const value = currentStyle[property]?.value;

  const selectedOrLastStyleSourceSelector = useStore(
    $selectedOrLastStyleSourceSelector
  );

  const isStyleInLocalState =
    selectedOrLastStyleSourceSelector &&
    selectedOrLastStyleSourceSelector.state === undefined;

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
            properties={[property]}
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
        <LayersList<TupleValue>
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
    </CollapsibleSectionBase>
  );
};
