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
import { toValue, type LayerValueItem } from "@webstudio-is/css-engine";
import { CollapsibleSectionRoot } from "~/builder/shared/collapsible-section";
import { $selectedOrLastStyleSourceSelector } from "~/shared/nano-states";
import { humanizeString } from "~/shared/string-utils";
import { repeatUntil } from "~/shared/array-utils";
import type { ComputedStyleDecl } from "~/shared/style-object-model";
import { getDots } from "../../shared/style-section";
import { RepeatedStyle } from "../../shared/repeated-style";
import { PropertySectionLabel } from "../../property-label";
import { useComputedStyles } from "../../shared/model";
import { createBatchUpdate } from "../../shared/use-style-data";
import {
  findTimingFunctionFromValue,
  type TransitionProperty,
} from "./transition-utils";
import { TransitionContent } from "./transition-content";

export { transitionLongHandProperties as properties };

const label = "Transitions";

const getTransitionLayers = (
  styles: ComputedStyleDecl[],
  property: TransitionProperty
) => {
  const transitionPropertyValue = styles.find(
    (styleDecl) => styleDecl.property === "transitionProperty"
  )?.cascadedValue;
  const currentPropertyValue = styles.find(
    (styleDecl) => styleDecl.property === property
  )?.cascadedValue;
  const transitionPropertiesCount =
    transitionPropertyValue?.type === "layers"
      ? transitionPropertyValue.value.length
      : 0;
  const definedLayers: LayerValueItem[] =
    currentPropertyValue?.type === "layers"
      ? currentPropertyValue.value
      : [properties[property].initial];
  return repeatUntil(definedLayers, transitionPropertiesCount);
};

const getLayerLabel = ({
  styles,
  index,
}: {
  styles: ComputedStyleDecl[];
  index: number;
}) => {
  // show label without hidden replacement
  const propertyLayer = getTransitionLayers(styles, "transitionProperty")[
    index
  ];
  const property = humanizeString(toValue({ ...propertyLayer, hidden: false }));
  const duration = toValue(
    getTransitionLayers(styles, "transitionDuration")[index]
  );
  const timingFunctionLayer = getTransitionLayers(
    styles,
    "transitionTimingFunction"
  )[index];
  const timingFunction = toValue({ ...timingFunctionLayer, hidden: false });
  const humanizedTimingFunction =
    findTimingFunctionFromValue(timingFunction) ?? timingFunction;
  const delay = toValue(getTransitionLayers(styles, "transitionDelay")[index]);

  return `${property}: ${duration} ${humanizedTimingFunction} ${delay}`;
};

const defaultTransitionLayers: Record<TransitionProperty, LayerValueItem> = {
  transitionProperty: { type: "unparsed", value: "opacity" },
  transitionDuration: { type: "unit", value: 200, unit: "ms" },
  transitionTimingFunction: { type: "keyword", value: "ease" },
  transitionDelay: { type: "unit", value: 0, unit: "ms" },
  transitionBehavior: { type: "keyword", value: "normal" },
};

export const Section = () => {
  const [isOpen, setIsOpen] = useState(true);

  const selectedOrLastStyleSourceSelector = useStore(
    $selectedOrLastStyleSourceSelector
  );

  const isStyleInLocalState =
    selectedOrLastStyleSourceSelector &&
    selectedOrLastStyleSourceSelector.state === undefined;
  const styles = useComputedStyles(transitionLongHandProperties);

  return (
    <CollapsibleSectionRoot
      fullWidth
      label={label}
      isOpen={isOpen}
      onOpenChange={setIsOpen}
      trigger={
        <SectionTitle
          dots={getDots(styles)}
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
                  setIsOpen(true);
                  const batch = createBatchUpdate();
                  for (const property of transitionLongHandProperties) {
                    batch.setProperty(property)({
                      type: "layers",
                      value: [
                        ...getTransitionLayers(styles, property),
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
        styles={styles}
        getItemProps={(index) => ({
          label: getLayerLabel({ styles, index }),
        })}
        renderItemContent={(index) => <TransitionContent index={index} />}
      />
    </CollapsibleSectionRoot>
  );
};
