import {
  KeywordValue,
  type LayerValueItem,
  type LayersValue,
  type StyleProperty,
  type TupleValue,
} from "@webstudio-is/css-engine";
import { CollapsibleSectionRoot } from "~/builder/shared/collapsible-section";
import type { SectionProps } from "../shared/section";
import {
  SectionTitle,
  SectionTitleButton,
  SectionTitleLabel,
  Text,
  Tooltip,
} from "@webstudio-is/design-system";
import { useState, useMemo } from "react";
import { getDots } from "../../shared/collapsible-section";
import { InfoCircleIcon, PlusIcon } from "@webstudio-is/icons";
import { PropertyName } from "../../shared/property-name";
import { LayersList } from "../../style-layers-list";
import { $selectedOrLastStyleSourceSelector } from "~/shared/nano-states";
import { useStore } from "@nanostores/react";
import { TransitionContent } from "./transition-content";
import {
  initialTransition,
  getTransitionProperties,
  deleteTransitionProperty,
  addTransitionLayer,
  deleteTransitionLayer,
  transitionProperties,
  editTransitionLayer,
  swapTransitionLayers,
} from "./transition-utils";

const label = "Transitions";
export const properties = Array.from(
  transitionProperties
) satisfies Array<StyleProperty>;

const isValidTransitionValue = (
  value: LayerValueItem
): value is KeywordValue => {
  return value.type === "keyword" || value.type === "unit";
};

export const Section = (props: SectionProps) => {
  const { currentStyle, createBatchUpdate } = props;
  const [isOpen, setIsOpen] = useState(true);
  const individualLayers = getTransitionProperties(currentStyle);
  const layers = useMemo(() => {
    const layers: LayersValue = { type: "layers", value: [] };
    const {
      transitionProperty,
      transitionDuration,
      transitionDelay,
      transitionTimingFunction,
    } = individualLayers;

    // transition-property is a mandatory property
    for (const [index] of transitionProperty.value.entries()) {
      const property = transitionProperty.value[index];
      const duration = transitionDuration.value[index];
      const timingFunction = transitionTimingFunction.value[index];
      const delay = transitionDelay.value[index];

      if (
        isValidTransitionValue(property) === true &&
        isValidTransitionValue(duration) === true &&
        isValidTransitionValue(timingFunction) === true &&
        isValidTransitionValue(delay) === true
      ) {
        const layer: TupleValue = {
          type: "tuple",
          value: [property, duration, timingFunction, delay],
        };
        layers.value.push(layer);
      }
    }

    return layers;
  }, [individualLayers]);

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
          dots={getDots(currentStyle, properties)}
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
                onClick={() =>
                  addTransitionLayer({
                    createBatchUpdate,
                    layers: individualLayers,
                  })
                }
              />
            </Tooltip>
          }
        >
          <PropertyName
            title={label}
            style={currentStyle}
            description="Animate the transition between states on this instance."
            properties={properties}
            label={<SectionTitleLabel>{label}</SectionTitleLabel>}
            onReset={() =>
              deleteTransitionProperty({
                createBatchUpdate,
              })
            }
          />
        </SectionTitle>
      }
    >
      {layers.value.length > 0 && (
        <LayersList
          {...props}
          property={properties[0]}
          value={layers}
          label={label}
          deleteProperty={() =>
            deleteTransitionProperty({
              createBatchUpdate,
            })
          }
          deleteLayer={(index) =>
            deleteTransitionLayer({
              index,
              createBatchUpdate,
              layers: individualLayers,
            })
          }
          swapLayers={(oldIndex, newIndex) =>
            swapTransitionLayers({
              oldIndex,
              newIndex,
              createBatchUpdate,
              layers: individualLayers,
            })
          }
          renderContent={(layerProps) => {
            if (layerProps.layer.type !== "tuple") {
              return <></>;
            }

            return (
              <TransitionContent
                {...layerProps}
                layer={layerProps.layer}
                onEditLayer={(index, layer, options) =>
                  editTransitionLayer({
                    index,
                    layer,
                    options,
                    createBatchUpdate,
                    layers: individualLayers,
                  })
                }
                tooltip={
                  <Tooltip
                    variant="wrapped"
                    content={
                      <Text>
                        Paste CSS code for a transition or part of a transition,
                        for example:
                        <br />
                        <br />
                        <Text variant="monoBold">{initialTransition}</Text>
                      </Text>
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
