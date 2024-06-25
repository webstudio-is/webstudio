import { useMemo, useState } from "react";
import {
  toValue,
  type InvalidValue,
  type LayersValue,
  type TupleValue,
  type KeywordValue,
  type UnitValue,
  type StyleProperty,
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
  extractTransitionProperties,
  parseCssValue,
  type ExtractedTransitionProperties,
} from "@webstudio-is/css-data";
import type {
  CreateBatchUpdate,
  DeleteProperty,
  StyleUpdateOptions,
} from "../../shared/use-style-data";
import { type IntermediateStyleValue } from "../../shared/css-value-input";
import { TransitionProperty } from "./transition-property";
import { TransitionTiming } from "./transition-timing";
import { CssValueInputContainer } from "../../shared/css-value-input";
import {
  defaultTransitionProperty,
  defaultTransitionDuration,
  defaultTransitionTimingFunction,
  defaultTransitionDelay,
  deleteTransitionLayer,
  parseTransitionShorthandToLayers,
} from "./transition-utils";
import type { StyleInfo } from "../../shared/style-info";

type TransitionContentProps = {
  index: number;
  property: StyleProperty;
  layer: TupleValue;
  propertyValue: string;
  tooltip: JSX.Element;
  onEditLayer: (
    index: number,
    layer: LayersValue,
    options: StyleUpdateOptions
  ) => void;
  deleteProperty: DeleteProperty;
  currentStyle: StyleInfo;
  createBatchUpdate: CreateBatchUpdate;
};

// We are allowing users to add/edit layers as shorthand from the style-panel
// So, we need to use the shorthand property to validate the layer too.
// We removed transition from properties list to drop support from advanced tab and so the typecasting.
const shortHandTransitionProperty = "transition" as StyleProperty;

export const TransitionContent = ({
  layer,
  index,
  tooltip,
  onEditLayer,
  propertyValue,
  createBatchUpdate,
  currentStyle,
}: TransitionContentProps) => {
  const [intermediateValue, setIntermediateValue] = useState<
    IntermediateStyleValue | InvalidValue | undefined
  >({ type: "intermediate", value: propertyValue });

  const { property, timing, delay, duration } =
    useMemo<ExtractedTransitionProperties>(
      () => extractTransitionProperties(layer),
      [layer]
    );

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

    const layerValue = parseCssValue(
      shortHandTransitionProperty,
      intermediateValue.value
    );
    if (layerValue.type === "invalid") {
      setIntermediateValue({
        type: "invalid",
        value: intermediateValue.value,
      });
      return;
    }

    const layers = parseTransitionShorthandToLayers(intermediateValue.value);

    onEditLayer(index, layers, options);
  };

  const handlePropertyUpdate = (
    params: ExtractedTransitionProperties,
    options: StyleUpdateOptions = { isEphemeral: false }
  ) => {
    const value: Array<UnitValue | KeywordValue> = Object.values({
      ...{ property, duration, delay, timing },
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
          property={property ?? defaultTransitionProperty}
          onPropertySelection={handlePropertyUpdate}
        />

        <Flex align="center">
          <Tooltip
            variant="wrapped"
            content={
              <Flex gap="2" direction="column">
                <Text variant="regularBold">Duration</Text>
                <Text variant="monoBold" color="moreSubtle">
                  transition-duration
                </Text>
                <Text>
                  Sets the length of time a transition animation should take to
                  complete.
                </Text>
              </Flex>
            }
          >
            <Label css={{ display: "inline" }}>Duration</Label>
          </Tooltip>
        </Flex>
        <CssValueInputContainer
          key={"transitionDuration"}
          property={"transitionDuration"}
          styleSource="local"
          value={duration ?? defaultTransitionDuration}
          keywords={[]}
          deleteProperty={() => {
            handlePropertyUpdate({ duration });
          }}
          setValue={(value, options) => {
            if (
              value === undefined ||
              value.type !== "layers" ||
              value.value[0].type !== "unit"
            ) {
              return;
            }

            handlePropertyUpdate({ duration: value.value[0] }, options);
          }}
        />

        <Flex align="center">
          <Tooltip
            variant="wrapped"
            content={
              <Flex gap="2" direction="column">
                <Text variant="regularBold">Delay</Text>
                <Text variant="monoBold" color="moreSubtle">
                  transition-delay
                </Text>
                <Text>
                  Specify the duration to wait before the transition begins.
                </Text>
              </Flex>
            }
          >
            <Label css={{ display: "inline" }}>Delay</Label>
          </Tooltip>
        </Flex>
        <CssValueInputContainer
          property={"transitionDelay"}
          key={"transitionDelay"}
          styleSource="local"
          value={delay ?? defaultTransitionDelay}
          keywords={[]}
          deleteProperty={() => handlePropertyUpdate({ delay })}
          setValue={(value, options) => {
            if (
              value === undefined ||
              value.type !== "layers" ||
              value.value[0].type !== "unit"
            ) {
              return;
            }

            handlePropertyUpdate({ delay: value.value[0] }, options);
          }}
        />

        <TransitionTiming
          timing={timing ?? defaultTransitionTimingFunction}
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
            {tooltip}
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
