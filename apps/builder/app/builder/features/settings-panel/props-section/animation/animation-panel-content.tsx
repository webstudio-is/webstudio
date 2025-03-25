import { useState } from "react";
import {
  Box,
  Flex,
  Grid,
  InputField,
  Label,
  Select,
  theme,
  toast,
} from "@webstudio-is/design-system";
import { keywordValues } from "@webstudio-is/css-data";
import { useIds } from "~/shared/form-utils";

import type {
  RangeUnitValue,
  ScrollAnimation,
  ViewAnimation,
} from "@webstudio-is/sdk";
import {
  RANGE_UNITS,
  rangeUnitValueSchema,
  scrollAnimationSchema,
  viewAnimationSchema,
} from "@webstudio-is/sdk";
import {
  CssValueInput,
  type IntermediateStyleValue,
} from "~/builder/features/style-panel/shared/css-value-input/css-value-input";
import {
  cssWideKeywords,
  toValue,
  type StyleValue,
} from "@webstudio-is/css-engine";
import { Keyframes } from "./animation-keyframes";
import { humanizeString } from "~/shared/string-utils";

const fillModeDescriptions: Record<
  NonNullable<ViewAnimation["timing"]["fill"]>,
  string
> = {
  both: "The animation state is applied before and after the active period. Set if unsure whether it's In or Out.",
  backwards:
    "The animation state is applied before the active period. Prefered for In Animations",
  forwards:
    "The animation state is applied after the active period. Prefered for Out Animations",
  none: "No animation is applied before or after the active period.",
};

const fillModeNames = Object.keys(fillModeDescriptions) as NonNullable<
  ViewAnimation["timing"]["fill"]
>[];

/**
 * https://developer.mozilla.org/en-US/docs/Web/CSS/animation-range-start
 *
 * <timeline-range-name>
 **/
const viewTimelineRangeName = {
  entry:
    "Animates during the subject element entry (starts entering → fully visible)",
  exit: "Animates during the subject element exit (starts exiting → fully hidden)",
  contain:
    "Animates only while the subject element is fully in view (fullly visible after entering → starts exiting)",
  cover:
    "Animates entire time the subject element is visible (starts entering → ends after exiting)",
  "entry-crossing":
    "Animates as the subject element enters (leading edge → trailing edge enters view)",
  "exit-crossing":
    "Animates as the subject element exits (leading edge → trailing edge leaves view)",
};

/**
 * Scroll does not support https://drafts.csswg.org/scroll-animations/#named-ranges
 * However, for simplicity and type unification with the view, we will use the names "start" and "end,"
 * which will be transformed as follows:
 * - "start" → `calc(0% + range)`
 * - "end" → `calc(100% - range)`
 */
const scrollTimelineRangeName = {
  start: "Distance from the top of the scroll container where animation begins",
  end: "Distance from the bottom of the scroll container where animation ends",
};

const unitOptions = RANGE_UNITS.map((unit) => ({
  id: unit,
  label: unit,
  type: "unit" as const,
}));

const RangeValueInput = ({
  id,
  value,
  onChange,
}: {
  id: string;
  value: RangeUnitValue;
  onChange: ((value: undefined, isEphemeral: true) => void) &
    ((value: RangeUnitValue, isEphemeral: boolean) => void);
}) => {
  const [intermediateValue, setIntermediateValue] = useState<
    StyleValue | IntermediateStyleValue
  >();

  return (
    <CssValueInput
      id={id}
      styleSource="default"
      value={value}
      /* marginLeft to allow negative values  */
      property={"margin-left"}
      unitOptions={unitOptions}
      intermediateValue={intermediateValue}
      onChange={(styleValue) => {
        setIntermediateValue(styleValue);

        const parsedValue = rangeUnitValueSchema.safeParse(styleValue);
        if (parsedValue.success) {
          onChange(parsedValue.data, true);
          return;
        }

        onChange(undefined, true);
      }}
      getOptions={() => []}
      onHighlight={() => {
        /* Nothing to Highlight */
      }}
      onChangeComplete={(event) => {
        const parsedValue = rangeUnitValueSchema.safeParse(event.value);
        if (parsedValue.success) {
          onChange(parsedValue.data, false);
          setIntermediateValue(undefined);
          return;
        }

        setIntermediateValue({
          type: "invalid",
          value: toValue(event.value),
        });
      }}
      onAbort={() => {
        onChange(undefined, true);
      }}
      onReset={() => {
        setIntermediateValue(undefined);
        onChange(undefined, true);
      }}
    />
  );
};

const EasingInput = ({
  id,
  value,
  onChange,
}: {
  id: string;
  value: string | undefined;
  onChange: (value: string | undefined, isEphemeral: boolean) => void;
}) => {
  const [intermediateValue, setIntermediateValue] = useState<
    StyleValue | IntermediateStyleValue
  >();

  return (
    <CssValueInput
      id={id}
      styleSource="default"
      value={
        value === undefined
          ? { type: "keyword", value: "ease" }
          : { type: "unparsed", value }
      }
      getOptions={() => [
        ...keywordValues["animation-timing-function"]
          .filter((value) => !cssWideKeywords.has(value))
          .map((value) => ({
            type: "keyword" as const,
            value,
          })),
      ]}
      property="animation-timing-function"
      intermediateValue={intermediateValue}
      onChange={(styleValue) => {
        setIntermediateValue(styleValue);
        /* @todo: allow to change some ephemeral property to see the result in action */
      }}
      onHighlight={(value) => {
        onChange(toValue(value), true);
      }}
      onChangeComplete={(event) => {
        onChange(toValue(event.value), false);
        setIntermediateValue(undefined);
      }}
      onAbort={() => {
        onChange(undefined, true);
      }}
      onReset={() => {
        setIntermediateValue(undefined);
        onChange(undefined, true);
      }}
    />
  );
};

type AnimationPanelContentProps = {
  type: "scroll" | "view";
  value: ScrollAnimation | ViewAnimation;

  onChange: ((
    value: ScrollAnimation | ViewAnimation,
    isEphemeral: boolean
  ) => void) &
    ((value: undefined, isEphemeral: true) => void);
};

export const AnimationPanelContent = ({
  onChange,
  value,
  type,
}: AnimationPanelContentProps) => {
  const fieldIds = useIds([
    "rangeStartName",
    "rangeStartValue",
    "rangeEndName",
    "rangeEndValue",
    "fill",
    "easing",
    "name",
  ] as const);

  const timelineRangeDescriptions =
    type === "scroll" ? scrollTimelineRangeName : viewTimelineRangeName;

  const timelineRangeNames = Object.keys(timelineRangeDescriptions);

  const animationSchema =
    type === "scroll" ? scrollAnimationSchema : viewAnimationSchema;

  const handleChange = (rawValue: unknown, isEphemeral: boolean) => {
    if (rawValue === undefined) {
      onChange(undefined, true);
      return;
    }

    const parsedValue = animationSchema.safeParse(rawValue);

    if (parsedValue.success) {
      onChange(parsedValue.data, isEphemeral);
      return;
    }

    console.error(parsedValue.error.format());
    toast.error("Animation schema is incompatible, try fix");
  };

  // Flex is used to allow the Keyframes to overflow without setting
  // gridTemplateRows: auto auto 1fr
  return (
    <Flex
      gap="2"
      direction="column"
      css={{
        maxHeight: "60dvh",

        paddingBlock: theme.panel.paddingBlock,
      }}
    >
      <Grid
        gap={1}
        align={"center"}
        css={{
          paddingInline: theme.panel.paddingInline,
          gridTemplateColumns: "1fr",
          flexShrink: 0,
        }}
      >
        <Label htmlFor={fieldIds.name}>Name</Label>
        <InputField
          id={fieldIds.name}
          css={{
            width: "100%",
            fontWeight: `inherit`,
          }}
          value={value.name}
          placeholder="Enter animation name"
          onChange={(event) => {
            const name = event.currentTarget.value;

            const newValue = {
              ...value,
              name,
            };

            handleChange(newValue, false);
          }}
        />
      </Grid>

      <Grid
        gap={1}
        align={"center"}
        css={{
          gridTemplateColumns: "1fr 1fr",
          paddingInline: theme.panel.paddingInline,
          flexShrink: 0,
        }}
      >
        <Label htmlFor={fieldIds.fill}>Fill Mode</Label>
        <Label htmlFor={fieldIds.easing}>Easing</Label>

        <Select
          id={fieldIds.fill}
          options={fillModeNames}
          getLabel={humanizeString}
          value={value.timing.fill ?? fillModeNames[0]}
          onItemHighlight={(fillModeName) => {
            if (fillModeName === undefined) {
              handleChange(undefined, true);
              return;
            }

            handleChange(
              {
                ...value,
                timing: {
                  ...value.timing,
                  fill: fillModeName,
                },
              },
              true
            );
          }}
          getDescription={(fillModeName: string) => (
            <Box
              css={{
                width: theme.spacing[28],
              }}
            >
              {
                fillModeDescriptions[
                  fillModeName as keyof typeof fillModeDescriptions
                ]
              }
            </Box>
          )}
          onChange={(fillModeName) => {
            handleChange(
              {
                ...value,
                timing: {
                  ...value.timing,
                  fill: fillModeName,
                },
              },
              false
            );
          }}
        />
        <EasingInput
          id={fieldIds.easing}
          value={value.timing.easing}
          onChange={(easing, isEphemeral) => {
            if (easing === undefined && isEphemeral) {
              handleChange(undefined, true);
              return;
            }

            handleChange(
              {
                ...value,
                timing: {
                  ...value.timing,
                  easing,
                },
              },
              isEphemeral
            );
          }}
        />
      </Grid>
      <Grid
        gap={1}
        align={"center"}
        css={{
          gridTemplateColumns: "1fr 1fr",
          paddingInline: theme.panel.paddingInline,
          flexShrink: 0,
        }}
      >
        <Label htmlFor={fieldIds.rangeStartName}>Range Start</Label>
        <Label htmlFor={fieldIds.rangeStartValue}>Value</Label>

        <Select
          id={fieldIds.rangeStartName}
          options={timelineRangeNames}
          getLabel={humanizeString}
          value={value.timing.rangeStart?.[0] ?? timelineRangeNames[0]!}
          getDescription={(timelineRangeName: string) => (
            <Box
              css={{
                width: theme.spacing[28],
              }}
            >
              {
                timelineRangeDescriptions[
                  timelineRangeName as keyof typeof timelineRangeDescriptions
                ]
              }
            </Box>
          )}
          onItemHighlight={(timelineRangeName) => {
            if (timelineRangeName === undefined) {
              handleChange(undefined, true);
              return;
            }

            handleChange(
              {
                ...value,
                timing: {
                  ...value.timing,
                  rangeStart: [
                    timelineRangeName,
                    value.timing.rangeStart?.[1] ?? {
                      type: "unit",
                      value: 0,
                      unit: "%",
                    },
                  ],
                },
              },
              true
            );
          }}
          onChange={(timelineRangeName) => {
            handleChange(
              {
                ...value,
                timing: {
                  ...value.timing,
                  rangeStart: [
                    timelineRangeName,
                    value.timing.rangeStart?.[1] ?? {
                      type: "unit",
                      value: 0,
                      unit: "%",
                    },
                  ],
                },
              },
              false
            );
          }}
        />
        <RangeValueInput
          id={fieldIds.rangeStartValue}
          value={
            value.timing.rangeStart?.[1] ?? {
              type: "unit",
              value: 0,
              unit: "%",
            }
          }
          onChange={(rangeStart, isEphemeral) => {
            if (rangeStart === undefined && isEphemeral) {
              handleChange(undefined, true);
              return;
            }

            const defaultTimelineRangeName = timelineRangeNames[0]!;

            handleChange(
              {
                ...value,
                timing: {
                  ...value.timing,
                  rangeStart: [
                    value.timing.rangeStart?.[0] ?? defaultTimelineRangeName,
                    rangeStart,
                  ],
                },
              },
              isEphemeral
            );
          }}
        />

        <Label htmlFor={fieldIds.rangeEndName}>Range End</Label>
        <Label htmlFor={fieldIds.rangeEndValue}>Value</Label>
        <Select
          id={fieldIds.rangeEndName}
          options={timelineRangeNames}
          getLabel={humanizeString}
          value={value.timing.rangeEnd?.[0] ?? timelineRangeNames[0]!}
          getDescription={(timelineRangeName: string) => (
            <Box
              css={{
                width: theme.spacing[28],
              }}
            >
              {
                timelineRangeDescriptions[
                  timelineRangeName as keyof typeof timelineRangeDescriptions
                ]
              }
            </Box>
          )}
          onItemHighlight={(timelineRangeName) => {
            if (timelineRangeName === undefined) {
              handleChange(undefined, true);
              return;
            }
            handleChange(
              {
                ...value,
                timing: {
                  ...value.timing,
                  rangeEnd: [
                    timelineRangeName,
                    value.timing.rangeEnd?.[1] ?? {
                      type: "unit",
                      value: 0,
                      unit: "%",
                    },
                  ],
                },
              },
              true
            );
          }}
          onChange={(timelineRangeName) => {
            handleChange(
              {
                ...value,
                timing: {
                  ...value.timing,
                  rangeEnd: [
                    timelineRangeName,
                    value.timing.rangeEnd?.[1] ?? {
                      type: "unit",
                      value: 0,
                      unit: "%",
                    },
                  ],
                },
              },
              false
            );
          }}
        />
        <RangeValueInput
          id={fieldIds.rangeEndValue}
          value={
            value.timing.rangeEnd?.[1] ?? {
              type: "unit",
              value: 0,
              unit: "%",
            }
          }
          onChange={(rangeEnd, isEphemeral) => {
            if (rangeEnd === undefined && isEphemeral) {
              handleChange(undefined, true);
              return;
            }

            const defaultTimelineRangeName = timelineRangeNames[0]!;

            handleChange(
              {
                ...value,
                timing: {
                  ...value.timing,
                  rangeEnd: [
                    value.timing.rangeEnd?.[0] ?? defaultTimelineRangeName,
                    rangeEnd,
                  ],
                },
              },
              isEphemeral
            );
          }}
        />
      </Grid>

      <Keyframes
        value={value.keyframes}
        onChange={(keyframes, isEphemeral) => {
          if (keyframes === undefined && isEphemeral) {
            handleChange(undefined, true);
            return;
          }

          handleChange({ ...value, keyframes }, isEphemeral);
        }}
      />
    </Flex>
  );
};
