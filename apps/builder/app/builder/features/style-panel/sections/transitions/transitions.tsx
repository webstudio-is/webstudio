import { useState } from "react";
import { useStore } from "@nanostores/react";
import { PlusIcon } from "@webstudio-is/icons";
import {
  SectionTitle,
  SectionTitleButton,
  Tooltip,
} from "@webstudio-is/design-system";
import {
  properties,
  transitionLongHandProperties,
} from "@webstudio-is/css-data";
import { CollapsibleSectionRoot } from "~/builder/shared/collapsible-section";
import type { SectionProps } from "../shared/section";
import { getDots } from "../../shared/collapsible-section";
import { $selectedOrLastStyleSourceSelector } from "~/shared/nano-states";
import { TransitionContent } from "./transition-content";
import {
  findTimingFunctionFromValue,
  type TransitionProperty,
} from "./transition-utils";
import { toValue, type LayerValueItem } from "@webstudio-is/css-engine";
import { humanizeString } from "~/shared/string-utils";
import { RepeatedStyle } from "../../shared/repeated-style";
import type { StyleInfo } from "../../shared/style-info";
import { repeatUntil } from "~/shared/array-utils";
import { PropertySectionLabel } from "../../property-label";

export { transitionLongHandProperties as properties };

const label = "Transitions";

const getTransitionLayers = (
  style: StyleInfo,
  property: TransitionProperty
) => {
  const transitionPropertiesCount =
    style.transitionProperty?.value?.type === "layers"
      ? style.transitionProperty.value.value.length
      : 0;
  const definedLayers: LayerValueItem[] =
    style[property]?.value.type === "layers"
      ? style[property].value.value
      : [properties[property].initial];
  return repeatUntil(definedLayers, transitionPropertiesCount);
};

const getLayerLabel = ({
  style,
  index,
}: {
  style: StyleInfo;
  index: number;
}) => {
  // show label without hidden replacement
  const propertyLayer =
    getTransitionLayers(style, "transitionProperty")[index] ??
    properties.transitionProperty.initial;
  const property = humanizeString(toValue({ ...propertyLayer, hidden: false }));
  const duration = toValue(
    getTransitionLayers(style, "transitionDuration")[index] ??
      properties.transitionDuration.initial
  );
  const timingFunctionLayer =
    getTransitionLayers(style, "transitionTimingFunction")[index] ??
    properties.transitionTimingFunction.initial;
  const timingFunction = toValue({ ...timingFunctionLayer, hidden: false });
  const humanizedTimingFunction =
    findTimingFunctionFromValue(timingFunction) ?? timingFunction;
  const delay = toValue(
    getTransitionLayers(style, "transitionDelay")[index] ??
      properties.transitionDelay.initial
  );

  return `${property}: ${duration} ${humanizedTimingFunction} ${delay}`;
};

const defaultTransitionLayers: Record<TransitionProperty, LayerValueItem> = {
  transitionProperty: { type: "unparsed", value: "opacity" },
  transitionDuration: { type: "unit", value: 200, unit: "ms" },
  transitionTimingFunction: { type: "keyword", value: "ease" },
  transitionDelay: { type: "unit", value: 0, unit: "ms" },
  transitionBehavior: { type: "keyword", value: "normal" },
};

export const Section = (props: SectionProps) => {
  const { currentStyle, createBatchUpdate } = props;
  const [isOpen, setIsOpen] = useState(true);

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
          dots={getDots(currentStyle, transitionLongHandProperties)}
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
                  const batch = createBatchUpdate();
                  for (const property of transitionLongHandProperties) {
                    batch.setProperty(property)({
                      type: "layers",
                      value: [
                        ...getTransitionLayers(currentStyle, property),
                        defaultTransitionLayers[property],
                      ],
                    });
                  }
                  batch.publish();
                }}
              />
            </Tooltip>
          }
        >
          <PropertySectionLabel
            label={label}
            description="Animate the transition between states on this instance."
            properties={transitionLongHandProperties}
          />
        </SectionTitle>
      }
    >
      <RepeatedStyle
        label={label}
        properties={[
          "transitionProperty",
          "transitionDuration",
          "transitionTimingFunction",
          "transitionDelay",
          "transitionBehavior",
        ]}
        style={currentStyle}
        createBatchUpdate={createBatchUpdate}
        getItemProps={(index) => ({
          label: getLayerLabel({ style: currentStyle, index }),
        })}
        renderItemContent={(index) => (
          <TransitionContent
            index={index}
            currentStyle={currentStyle}
            createBatchUpdate={createBatchUpdate}
          />
        )}
      />
    </CollapsibleSectionRoot>
  );
};
