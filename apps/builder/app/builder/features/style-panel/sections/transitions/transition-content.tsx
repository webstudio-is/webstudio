import { useMemo, useState } from "react";
import {
  toValue,
  type InvalidValue,
  type LayersValue,
  type TupleValue,
  KeywordValue,
  UnitValue,
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
  parseTransition,
  type ExtractedTransitionProperties,
} from "@webstudio-is/css-data";
import { InfoCircleIcon } from "@webstudio-is/icons";
import type {
  DeleteProperty,
  StyleUpdateOptions,
} from "../../shared/use-style-data";
import { type IntermediateStyleValue } from "../../shared/css-value-input";
import { TransitionProperty } from "./transition-property";
import { TransitionTiming } from "./transition-timing";
import { CssValueInputContainer } from "../../shared/css-value-input";

type TransitionContentProps = {
  index: number;
  layer: TupleValue;
  transition: string;
  onEditLayer: (index: number, layer: LayersValue) => void;
  deleteProperty: DeleteProperty;
};

export const TransitionContent = ({
  layer,
  transition,
  onEditLayer,
  index,
  deleteProperty,
}: TransitionContentProps) => {
  const [intermediateValue, setIntermediateValue] = useState<
    IntermediateStyleValue | InvalidValue | undefined
  >({ type: "intermediate", value: transition });

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

  const handleComplete = () => {
    if (intermediateValue === undefined) {
      return;
    }

    const layers = parseTransition(intermediateValue.value);
    if (layers.type === "invalid") {
      setIntermediateValue({
        type: "invalid",
        value: intermediateValue.value,
      });
      return;
    }

    onEditLayer(index, layers);
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
    const newLayer: TupleValue = { type: "tuple", value };

    setIntermediateValue({
      type: "intermediate",
      value: toValue(newLayer),
    });

    if (options.isEphemeral === false) {
      onEditLayer(index, { type: "layers", value: [newLayer] });
    }
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
          /* Browser defaults for transition-property - all */
          property={property ?? { type: "keyword" as const, value: "all" }}
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
          /* Browser default for transition-duration */
          value={duration ?? { type: "unit", value: 0, unit: "ms" }}
          keywords={[]}
          deleteProperty={() => {
            handlePropertyUpdate({ duration });
          }}
          setValue={(value, options) => {
            if (value === undefined) {
              return;
            }
            handlePropertyUpdate({ duration: value }, options);
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
          /* Browser default for transition-delay */
          value={delay ?? { type: "unit", value: 0, unit: "ms" }}
          keywords={[]}
          deleteProperty={() => handlePropertyUpdate({ delay })}
          setValue={(value, options) => {
            if (value === undefined) {
              return;
            }
            handlePropertyUpdate({ delay: value }, options);
          }}
        />

        <TransitionTiming
          /* Browser defaults for transition-property - ease */
          timing={timing ?? { type: "keyword", value: "ease" }}
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
                  <Text variant="monoBold">opacity 200ms ease</Text>
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
          state={intermediateValue?.type === "invalid" ? "invalid" : undefined}
          value={intermediateValue?.value ?? ""}
          onChange={handleChange}
          onBlur={handleComplete}
          onKeyDown={(event) => {
            event.stopPropagation();

            if (event.key === "Enter") {
              handleComplete();
              event.preventDefault();
            }

            if (event.key === "Escape") {
              if (intermediateValue === undefined) {
                return;
              }

              deleteProperty("transition", { isEphemeral: true });
              setIntermediateValue(undefined);
              event.preventDefault();
            }
          }}
        />
      </Flex>
    </Flex>
  );
};
