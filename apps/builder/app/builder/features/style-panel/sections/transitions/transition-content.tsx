import { useState } from "react";
import {
  toValue,
  type InvalidValue,
  type LayersValue,
  type TupleValue,
  type KeywordValue,
  type UnitValue,
  type StyleProperty,
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
import {
  parseCssValue,
  properties,
  type ExtractedTransitionProperties,
} from "@webstudio-is/css-data";
import type {
  CreateBatchUpdate,
  StyleUpdateOptions,
} from "../../shared/use-style-data";
import { type IntermediateStyleValue } from "../../shared/css-value-input";
import { TransitionProperty } from "./transition-property";
import { TransitionTiming } from "./transition-timing";
import { CssValueInputContainer } from "../../shared/css-value-input";
import { deleteTransitionLayer, editTransitionLayer } from "./transition-utils";
import type { StyleInfo } from "../../shared/style-info";
import { parseCssFragment } from "../../shared/parse-css-fragment";
import { InfoCircleIcon } from "@webstudio-is/icons";
import { PropertyInlineLabel } from "../../property-label";

type TransitionContentProps = {
  index: number;
  currentStyle: StyleInfo;
  createBatchUpdate: CreateBatchUpdate;
};

// We are allowing users to add/edit layers as shorthand from the style-panel
// So, we need to use the shorthand property to validate the layer too.
// We removed transition from properties list to drop support from advanced tab and so the typecasting.
const shortHandTransitionProperty = "transition" as StyleProperty;

const getLayer = (value: undefined | StyleValue, index: number) =>
  value?.type === "layers" ? value.value[index] : undefined;

export const TransitionContent = ({
  index,
  createBatchUpdate,
  currentStyle,
}: TransitionContentProps) => {
  const onEditLayer = (
    index: number,
    layers: LayersValue,
    options: StyleUpdateOptions
  ) => {
    editTransitionLayer({
      index,
      layers,
      options,
      createBatchUpdate,
      currentStyle,
    });
  };

  const property = getLayer(currentStyle.transitionProperty?.value, index);
  const duration = getLayer(currentStyle.transitionDuration?.value, index);
  const timingFunction = getLayer(
    currentStyle.transitionTimingFunction?.value,
    index
  );
  const delay = getLayer(currentStyle.transitionDelay?.value, index);
  const behavior = getLayer(currentStyle.transitionBehavior?.value, index);

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

  const handleComplete = (options: StyleUpdateOptions) => {
    if (intermediateValue === undefined) {
      return;
    }

    const parsed = parseCssFragment(intermediateValue.value, "transition");
    const tuple: TupleValue = {
      type: "tuple",
      value: [
        getLayer(parsed.get("transitionProperty"), 0),
        getLayer(parsed.get("transitionDuration"), 0),
        getLayer(parsed.get("transitionTimingFunction"), 0),
        getLayer(parsed.get("transitionDelay"), 0),
        // @todo getLayer(parsed.get("transitionBehavior"), 0),
      ].filter(Boolean) as TupleValueItem[],
    };
    if (tuple.value.length === 0) {
      setIntermediateValue({
        type: "invalid",
        value: intermediateValue.value,
      });
    }
    const layers: LayersValue = {
      type: "layers",
      value: [tuple],
    };

    onEditLayer(index, layers, options);
  };

  const handlePropertyUpdate = (
    params: ExtractedTransitionProperties,
    options: StyleUpdateOptions = { isEphemeral: false }
  ) => {
    const value: Array<UnitValue | KeywordValue> = Object.values({
      ...{ property, duration, delay, timing: timingFunction },
      ...params,
    }).filter<UnitValue | KeywordValue>(
      (item): item is UnitValue | KeywordValue => item != null
    );
    const layerTuple: TupleValue = { type: "tuple", value };
    const layerValue = parseCssValue(
      shortHandTransitionProperty,
      toValue(layerTuple)
    );

    if (layerValue.type === "invalid") {
      setIntermediateValue({
        type: "invalid",
        value: toValue(layerTuple),
      });
      return;
    }

    setIntermediateValue({
      type: "intermediate",
      value: toValue(layerTuple),
    });

    onEditLayer(index, { type: "layers", value: [layerTuple] }, options);
  };

  return (
    <Flex direction="column">
      <Grid
        gap="2"
        css={{
          px: theme.spacing[9],
          py: theme.spacing[5],
          gridTemplateColumns: `1fr ${theme.spacing[23]}`,
          gridTemplateRows: theme.spacing[13],
        }}
      >
        <TransitionProperty
          currentStyle={currentStyle}
          property={property ?? properties.transitionProperty.initial}
          onPropertySelection={handlePropertyUpdate}
        />

        <PropertyInlineLabel
          label="Duration"
          description="Sets the length of time a transition animation should take to complete."
          properties={["transitionDuration"]}
        />
        <CssValueInputContainer
          key={"transitionDuration"}
          property={"transitionDuration"}
          styleSource="local"
          value={duration ?? properties.transitionDuration.initial}
          keywords={[]}
          deleteProperty={() => {}}
          setValue={(value, options) => {
            if (value === undefined) {
              return;
            }

            if (value.type === "unit") {
              handlePropertyUpdate({ duration: value }, options);
              return;
            }

            if (value.type === "layers" && value.value[0].type === "unit") {
              handlePropertyUpdate({ duration: value.value[0] }, options);
            }
          }}
        />

        <PropertyInlineLabel
          label="Delay"
          description="Specify the duration to wait before the transition begins."
          properties={["transitionDelay"]}
        />
        <CssValueInputContainer
          property={"transitionDelay"}
          key={"transitionDelay"}
          styleSource="local"
          value={delay ?? properties.transitionDelay.initial}
          keywords={[]}
          deleteProperty={() => {}}
          setValue={(value, options) => {
            if (value === undefined) {
              return;
            }

            if (value.type === "unit") {
              handlePropertyUpdate({ delay: value }, options);
              return;
            }

            if (value.type === "layers" && value.value[0].type === "unit") {
              handlePropertyUpdate({ delay: value.value[0] }, options);
            }
          }}
        />

        <TransitionTiming
          timing={timingFunction ?? properties.transitionTimingFunction.initial}
          onTimingSelection={handlePropertyUpdate}
        />
      </Grid>
      <Separator css={{ gridColumn: "span 2" }} />
      <Flex
        direction="column"
        css={{
          px: theme.spacing[9],
          paddingTop: theme.spacing[5],
          paddingBottom: theme.spacing[9],
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
          onBlur={() => handleComplete({ isEphemeral: true })}
          onKeyDown={(event) => {
            event.stopPropagation();

            if (event.key === "Enter") {
              handleComplete({ isEphemeral: false });
              event.preventDefault();
            }

            if (event.key === "Escape") {
              if (intermediateValue === undefined) {
                return;
              }

              deleteTransitionLayer({
                currentStyle,
                createBatchUpdate,
                index,
                options: { isEphemeral: true },
              });
              setIntermediateValue(undefined);
              event.preventDefault();
            }
          }}
        />
      </Flex>
    </Flex>
  );
};
