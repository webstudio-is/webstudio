import { useMemo, useState } from "react";
import {
  toValue,
  type InvalidValue,
  type LayersValue,
  type TupleValue,
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
  extractTransitionProperties,
  parseTransition,
} from "@webstudio-is/css-data";
import { InformationIcon } from "@webstudio-is/icons";
import type { DeleteProperty } from "../../shared/use-style-data";
import { type IntermediateStyleValue } from "../../shared/css-value-input";
import { TransitionProperty } from "./transition-property";
import { TransitionTiming } from "./transition-timing";

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

  const { property, timing, delay, duration } = useMemo(() => {
    setIntermediateValue({ type: "intermediate", value: transition });
    return extractTransitionProperties(layer);
  }, [layer, transition]);

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
    setIntermediateValue(undefined);
  };

  const handleOnPropertySelection = (newProperty: TupleValueItem) => {
    const value: TupleValueItem[] = [
      newProperty,
      duration,
      timing,
      delay,
    ].filter<TupleValueItem>((item): item is TupleValueItem => item !== null);

    const newLayer: TupleValue = { type: "tuple", value };

    setIntermediateValue({
      type: "intermediate",
      value: toValue(newLayer),
    });

    onEditLayer(index, { type: "layers", value: [newLayer] });
  };

  const handleOnTimingSelection = (newTiming: TupleValueItem) => {
    const value: TupleValueItem[] = [
      property,
      duration,
      newTiming,
      delay,
    ].filter<TupleValueItem>((item): item is TupleValueItem => item !== null);

    const newLayer: TupleValue = { type: "tuple", value };

    setIntermediateValue({
      type: "intermediate",
      value: toValue(newLayer),
    });

    onEditLayer(index, { type: "layers", value: [newLayer] });
  };

  return (
    <Flex direction="column">
      <Grid
        gap="2"
        css={{
          px: theme.spacing[8],
          py: theme.spacing[8],
          gridTemplateColumns: `1fr ${theme.spacing[22]}`,
        }}
      >
        <TransitionProperty
          /* Browser defaults for transition-property - all */
          property={property ?? { type: "keyword", value: "all" }}
          onPropertySelection={handleOnPropertySelection}
        />

        <TransitionTiming
          /* Browser defaults for transition-property - ease */
          timing={timing ?? { type: "keyword", value: "ease" }}
          onTimingSelection={handleOnTimingSelection}
        />
      </Grid>
      <Separator css={{ gridColumn: "span 2" }} />
      <Flex
        direction="column"
        css={{
          px: theme.spacing[8],
          py: theme.spacing[8],
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
                  opacity 200ms ease;
                </Text>
              }
            >
              <InformationIcon />
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
