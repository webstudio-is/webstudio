import { useState } from "react";
import { useStore } from "@nanostores/react";
import { PlusIcon } from "@webstudio-is/icons";
import {
  SectionTitle,
  SectionTitleButton,
  SectionTitleLabel,
  Tooltip,
} from "@webstudio-is/design-system";
import { transitionLongHandProperties } from "@webstudio-is/css-data";

import { CollapsibleSectionRoot } from "~/builder/shared/collapsible-section";
import type { SectionProps } from "../shared/section";
import { getDots } from "../../shared/collapsible-section";
import { PropertyName } from "../../shared/property-name";
import { $selectedOrLastStyleSourceSelector } from "~/shared/nano-states";
import { TransitionContent } from "./transition-content";
import {
  deleteTransitionProperties,
  addDefaultTransitionLayer,
  findTimingFunctionFromValue,
  defaultTransitionProperty,
  defaultTransitionDuration,
  defaultTransitionTimingFunction,
  defaultTransitionDelay,
} from "./transition-utils";
import {
  toValue,
  type StyleValue,
  type StyleProperty,
} from "@webstudio-is/css-engine";
import { humanizeString } from "~/shared/string-utils";
import { RepeatedStyle } from "../../shared/repeated-style";
import { getStyleSource, type StyleInfo } from "../../shared/style-info";

const label = "Transitions";
export const properties = (
  transitionLongHandProperties as unknown as Array<StyleProperty>
).filter((property) => property !== "transitionBehavior");

const getLayer = (value: undefined | StyleValue, index: number) =>
  value?.type === "layers" ? value.value[index] : undefined;

const getLayerLabel = ({
  style,
  index,
}: {
  style: StyleInfo;
  index: number;
}) => {
  // show label without hidden replacement
  const propertyLayer =
    getLayer(style.transitionProperty?.value, index) ??
    defaultTransitionProperty;
  const property = humanizeString(toValue({ ...propertyLayer, hidden: false }));
  const duration = toValue(
    getLayer(style.transitionDuration?.value, index) ??
      defaultTransitionDuration
  );
  const timingFunctionLayer =
    getLayer(style.transitionTimingFunction?.value, index) ??
    defaultTransitionTimingFunction;
  const timingFunction = toValue({ ...timingFunctionLayer, hidden: false });
  const humanizedTimingFunction =
    findTimingFunctionFromValue(timingFunction) ?? timingFunction;
  const delay = toValue(
    getLayer(style.transitionDelay?.value, index) ?? defaultTransitionDelay
  );
  return `${property}: ${duration} ${humanizedTimingFunction} ${delay}`;
};

export const Section = (props: SectionProps) => {
  const { currentStyle, createBatchUpdate } = props;
  const [isOpen, setIsOpen] = useState(true);
  const propertyValue = currentStyle?.["transitionProperty"]?.value;
  const sectionStyleSource =
    propertyValue?.type === "unparsed" ||
    propertyValue?.type === "guaranteedInvalid"
      ? undefined
      : getStyleSource(currentStyle["transitionProperty"]);

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
                  addDefaultTransitionLayer({
                    createBatchUpdate,
                    currentStyle,
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
            label={
              <SectionTitleLabel color={sectionStyleSource}>
                {label}
              </SectionTitleLabel>
            }
            onReset={() =>
              deleteTransitionProperties({
                createBatchUpdate,
              })
            }
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
