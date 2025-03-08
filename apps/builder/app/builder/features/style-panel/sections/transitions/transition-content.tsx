import { useState } from "react";
import {
  toValue,
  type InvalidValue,
  type StyleValue,
  type TupleValueItem,
} from "@webstudio-is/css-engine";
import {
  Flex,
  Label,
  TextArea,
  theme,
  textVariants,
  Separator,
  Tooltip,
  Text,
  Grid,
} from "@webstudio-is/design-system";
import { InfoCircleIcon } from "@webstudio-is/icons";
import { propertiesData, propertyDescriptions } from "@webstudio-is/css-data";
import { type IntermediateStyleValue } from "../../shared/css-value-input";
import { CssValueInputContainer } from "../../shared/css-value-input";
import { parseCssFragment } from "../../shared/css-fragment";
import { PropertyInlineLabel } from "../../property-label";
import { TransitionProperty } from "./transition-property";
import {
  $availableVariables,
  $availableUnitVariables,
  useComputedStyles,
} from "../../shared/model";
import {
  editRepeatedStyleItem,
  setRepeatedStyleItem,
} from "../../shared/repeated-style";

const getLayer = (value: undefined | StyleValue, index: number) =>
  value?.type === "layers" ? value.value[index] : undefined;

export const TransitionContent = ({ index }: { index: number }) => {
  const styles = useComputedStyles([
    "transitionProperty",
    "transitionDuration",
    "transitionTimingFunction",
    "transitionDelay",
    "transitionBehavior",
  ]);
  const [
    transitionProperty,
    transitionDuration,
    transitionTimingFunction,
    transitionDelay,
    transitionBehavior,
  ] = styles;

  const property = getLayer(transitionProperty.cascadedValue, index);
  const duration = getLayer(transitionDuration.cascadedValue, index);
  const timingFunction = getLayer(
    transitionTimingFunction.cascadedValue,
    index
  );
  const delay = getLayer(transitionDelay.cascadedValue, index);
  const behavior = getLayer(transitionBehavior.cascadedValue, index);

  const [intermediateValue, setIntermediateValue] = useState<
    IntermediateStyleValue | InvalidValue | undefined
  >(() => ({
    type: "intermediate",
    value: toValue({
      type: "tuple",
      value: [property, duration, timingFunction, delay, behavior].filter(
        Boolean
      ) as TupleValueItem[],
    }),
  }));

  const handleChange = (value: string) => {
    setIntermediateValue({
      type: "intermediate",
      value,
    });
  };

  const handleComplete = () => {
    if (intermediateValue === undefined) {
      return;
    }
    editRepeatedStyleItem(
      styles,
      index,
      parseCssFragment(intermediateValue.value, ["transition"])
    );
  };

  const updateIntermediateValue = (params: {
    property?: StyleValue;
    timing?: StyleValue;
    delay?: StyleValue;
    duration?: StyleValue;
  }) => {
    const shorthand = toValue({
      type: "tuple",
      value: [
        params.property ?? property,
        params.duration ?? duration,
        params.delay ?? delay,
        params.timing ?? timingFunction,
      ].filter((item): item is TupleValueItem => item !== undefined),
    });
    setIntermediateValue({
      type: "intermediate",
      value: shorthand,
    });
  };

  return (
    <Flex direction="column">
      <Grid
        gap="2"
        css={{
          padding: theme.panel.padding,
          gridTemplateColumns: `1fr ${theme.spacing[23]}`,
          gridTemplateRows: theme.spacing[13],
        }}
      >
        <PropertyInlineLabel
          label="Property"
          description={propertyDescriptions.transitionProperty}
          properties={["transitionProperty"]}
        />
        <TransitionProperty
          value={property ?? propertiesData["transition-property"].initial}
          onChange={(value) => {
            updateIntermediateValue({ property: value });
            setRepeatedStyleItem(transitionProperty, index, value);
          }}
        />

        <PropertyInlineLabel
          label="Duration"
          description={propertyDescriptions.transitionDuration}
          properties={["transitionDuration"]}
        />
        <CssValueInputContainer
          property="transitionDuration"
          styleSource="local"
          getOptions={() => $availableUnitVariables.get()}
          value={duration ?? propertiesData["transition-duration"].initial}
          deleteProperty={() => {}}
          setValue={(value, options) => {
            if (value === undefined) {
              return;
            }
            if (value.type === "layers") {
              [value] = value.value;
            }
            if (value.type === "unit" || value.type === "var") {
              updateIntermediateValue({ duration: value });
              setRepeatedStyleItem(transitionDuration, index, value, options);
            }
          }}
        />

        <PropertyInlineLabel
          label="Delay"
          description={propertyDescriptions.transitionDelay}
          properties={["transitionDelay"]}
        />
        <CssValueInputContainer
          property="transitionDelay"
          styleSource="local"
          getOptions={() => $availableUnitVariables.get()}
          value={delay ?? propertiesData["transition-delay"].initial}
          deleteProperty={() => {}}
          setValue={(value, options) => {
            if (value === undefined) {
              return;
            }
            if (value.type === "layers") {
              [value] = value.value;
            }
            if (value.type === "unit" || value.type === "var") {
              updateIntermediateValue({ delay: value });
              setRepeatedStyleItem(transitionDelay, index, value, options);
            }
          }}
        />

        <PropertyInlineLabel
          label="Easing"
          description={propertyDescriptions.transitionTimingFunction}
          properties={["transitionTimingFunction"]}
        />
        <CssValueInputContainer
          property="transitionTimingFunction"
          styleSource="local"
          getOptions={() => [
            { type: "keyword", value: "linear" },
            { type: "keyword", value: "ease" },
            { type: "keyword", value: "ease-in" },
            { type: "keyword", value: "ease-out" },
            { type: "keyword", value: "ease-in-out" },
            { type: "keyword", value: "step-start" },
            { type: "keyword", value: "step-end" },
            ...$availableVariables.get(),
          ]}
          value={
            timingFunction ??
            propertiesData["transition-timing-function"].initial
          }
          deleteProperty={() => {}}
          setValue={(value, options) => {
            if (value === undefined) {
              return;
            }
            if (value.type === "layers") {
              [value] = value.value;
            }
            if (value.type === "keyword" || value.type === "var") {
              updateIntermediateValue({ timing: value });
              setRepeatedStyleItem(
                transitionTimingFunction,
                index,
                value,
                options
              );
            }
          }}
        />
      </Grid>

      <Separator css={{ gridColumn: "span 2" }} />
      <Flex
        direction="column"
        css={{
          padding: theme.panel.padding,
          gap: theme.spacing[3],
          minWidth: theme.spacing[30],
        }}
      >
        <Label>
          <Flex align="center" gap="1">
            Code
            <Tooltip
              variant="wrapped"
              content={
                <Text>
                  Paste CSS code for a transition or part of a transition, for
                  example:
                  <br />
                  <br />
                  <Text variant="monoBold">opacity 200ms ease 0s</Text>
                </Text>
              }
            >
              <InfoCircleIcon />
            </Tooltip>
          </Flex>
        </Label>
        <TextArea
          rows={3}
          name="description"
          css={{ minHeight: theme.spacing[14], ...textVariants.mono }}
          color={intermediateValue?.type === "invalid" ? "error" : undefined}
          value={intermediateValue?.value ?? ""}
          onChange={handleChange}
          onBlur={handleComplete}
          onKeyDown={(event) => {
            event.stopPropagation();

            if (event.key === "Enter") {
              handleComplete();
              event.preventDefault();
            }
          }}
        />
      </Flex>
    </Flex>
  );
};
