import { useState, type ReactNode } from "react";
import {
  Box,
  Grid,
  InputField,
  ScrollArea,
  Select,
  theme,
  toast,
  ToggleGroup,
  ToggleGroupButton,
  Tooltip,
} from "@webstudio-is/design-system";
import { keywordValues } from "@webstudio-is/css-data";

import type {
  DurationUnitValue,
  RangeUnitValue,
  ScrollAnimation,
  ViewAnimation,
} from "@webstudio-is/sdk";
import {
  durationUnitValueSchema,
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

import {
  EllipsesIcon,
  RangeContain50Icon,
  RangeContainIcon,
  RangeCoverIcon,
} from "@webstudio-is/icons";
import { $availableUnitVariables } from "~/builder/features/style-panel/shared/model";
import isEqual from "fast-deep-equal";
import { FieldLabel } from "../../property-label";

const RotateIcon180 = ({ children }: { children: React.ReactNode }) => {
  return (
    <Box
      css={{
        transform: "rotate(180deg)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {children}
    </Box>
  );
};

const fillModeDescriptions: Record<
  NonNullable<ViewAnimation["timing"]["fill"]>,
  string
> = {
  both: "The animation state is applied before and after the active period. Set if unsure whether it's In or Out",
  backwards:
    "The animation state is applied before the active period. Prefered for In Animations",
  forwards:
    "The animation state is applied after the active period. Prefered for Out Animations",
  none: "No animation is applied before or after the active period",
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
  value,
  onChange,
  disabled,
}: {
  value: RangeUnitValue;
  disabled?: boolean;
  onChange: ((value: undefined, isEphemeral: true) => void) &
    ((value: RangeUnitValue, isEphemeral: boolean) => void);
}) => {
  const [intermediateValue, setIntermediateValue] = useState<
    StyleValue | IntermediateStyleValue
  >();

  return (
    <CssValueInput
      disabled={disabled}
      styleSource="default"
      value={value}
      /* marginLeft to allow negative values  */
      property={"margin-left"}
      unitOptions={unitOptions}
      intermediateValue={intermediateValue}
      onChange={(styleValue) => {
        setIntermediateValue(styleValue);

        if (styleValue?.type !== "intermediate") {
          const parsedValue = rangeUnitValueSchema.safeParse(styleValue);
          if (parsedValue.success) {
            onChange(parsedValue.data, true);
            return;
          }
        }

        onChange(undefined, true);
      }}
      getOptions={() => $availableUnitVariables.get()}
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
  value,
  onChange,
}: {
  value: string | undefined;
  onChange: (value: string | undefined, isEphemeral: boolean) => void;
}) => {
  const [intermediateValue, setIntermediateValue] = useState<
    StyleValue | IntermediateStyleValue
  >();

  return (
    <CssValueInput
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
        ...$availableUnitVariables.get(),
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

const DurationInput = ({
  value,
  onChange,
}: {
  value: DurationUnitValue | undefined;
  onChange: (
    value: DurationUnitValue | undefined,
    isEphemeral: boolean
  ) => void;
}) => {
  const [intermediateValue, setIntermediateValue] = useState<
    StyleValue | IntermediateStyleValue
  >();

  return (
    <CssValueInput
      styleSource="default"
      value={value}
      placeholder="auto"
      property="animation-duration"
      intermediateValue={intermediateValue}
      onChange={(styleValue) => {
        setIntermediateValue(styleValue);
      }}
      getOptions={() => $availableUnitVariables.get()}
      onHighlight={() => {}}
      onChangeComplete={(event) => {
        const value = durationUnitValueSchema.safeParse(event.value);
        onChange(undefined, true);
        // allow user to reset with initial value
        if (toValue(event.value).toLowerCase() === "auto") {
          onChange(undefined, false);
          setIntermediateValue(undefined);
          return;
        }
        if (value.success) {
          onChange(value.data, false);
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
        onChange(undefined, false);
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

const defaultRangeStart = {
  type: "unit",
  value: 0,
  unit: "%",
};

const defaultRangeEnd = {
  type: "unit",
  value: 100,
  unit: "%",
};

const PanelContainer = ({ children }: { children: ReactNode }) => {
  return (
    <ScrollArea>
      <Grid gap={2} css={{ paddingBlock: theme.panel.paddingBlock }}>
        {children}
      </Grid>
    </ScrollArea>
  );
};

const simplifiedRanges = [
  [
    "cover 0%",
    <RangeCoverIcon />,
    ["cover", { type: "unit", unit: "%", value: 0 }],
    "the subject just begins to appear in view",
  ],
  [
    "contain 0%",
    <RangeContainIcon />,
    ["contain", { type: "unit", unit: "%", value: 0 }],
    "when the subject becomes fully visible",
  ],
  [
    "contain 50%",
    <RangeContain50Icon />,
    ["contain", { type: "unit", unit: "%", value: 50 }],
    "when the subject is centered in the view",
  ],

  [
    "contain 100%",
    <RotateIcon180>
      <RangeContainIcon />
    </RotateIcon180>,
    ["contain", { type: "unit", unit: "%", value: 100 }],
    "when the subject begins to leave the view but is still fully visible",
  ],

  [
    "cover 100%",
    <RotateIcon180>
      <RangeCoverIcon />
    </RotateIcon180>,
    ["cover", { type: "unit", unit: "%", value: 100 }],
    "when the subject is completely out of view",
  ],
] as const;

const simplifiedStartRanges = simplifiedRanges.slice(0, -1);
const simplifiedEndRanges = simplifiedRanges.slice(1);

const isRangeEqual = (
  rangeA:
    | Readonly<ViewAnimation["timing"]["rangeStart"]>
    | Readonly<ScrollAnimation["timing"]["rangeStart"]>,
  rangeB:
    | Readonly<ViewAnimation["timing"]["rangeStart"]>
    | Readonly<ScrollAnimation["timing"]["rangeStart"]>
): boolean => {
  if (isEqual(rangeA, rangeB)) {
    return true;
  }

  if (rangeA === undefined || rangeB === undefined) {
    return false;
  }

  const rangeAValue = `${rangeA[0]} ${toValue(rangeA[1])}`;
  const rangeBValue = `${rangeB[0]} ${toValue(rangeB[1])}`;

  const rangesMap = {
    "entry 0%": "cover 0%",
    "entry 100%": "contain 0%",
    "exit 0%": "contain 100%",
    "exit 100%": "cover 100%",
    "cover 50%": "contain 50%",
  };

  return (
    (rangesMap[rangeAValue as keyof typeof rangesMap] ?? rangeAValue) ===
    (rangesMap[rangeBValue as keyof typeof rangesMap] ?? rangeBValue)
  );
};

export const AnimationPanelContent = ({
  onChange,
  value,
  type,
}: AnimationPanelContentProps) => {
  const startRangeIndex = simplifiedStartRanges.findIndex(([, , range]) =>
    isRangeEqual(range, value.timing.rangeStart)
  );

  const [startRangeValue] = simplifiedStartRanges.find(([, , range]) =>
    isRangeEqual(range, value.timing.rangeStart)
  ) ?? [undefined, undefined, undefined];

  const endRangeIndex = simplifiedEndRanges.findIndex(([, , range]) =>
    isRangeEqual(range, value.timing.rangeEnd)
  );

  const [endRangeValue] = simplifiedEndRanges.find(([, , range]) =>
    isRangeEqual(range, value.timing.rangeEnd)
  ) ?? [undefined, undefined, undefined];

  const [isAdvancedRangeStart, setIsAdvancedRangeStart] = useState(
    () => startRangeValue === undefined
  );

  const [isAdvancedRangeEnd, setIsAdvancedRangeEnd] = useState(
    () => endRangeValue === undefined
  );

  const isScrollAnimation = type === "scroll";

  const timelineRangeDescriptions = isScrollAnimation
    ? scrollTimelineRangeName
    : viewTimelineRangeName;

  const timelineRangeNames = Object.keys(timelineRangeDescriptions);

  const isRangeEndEnabled = value.timing.duration === undefined;

  const animationSchema = isScrollAnimation
    ? scrollAnimationSchema
    : viewAnimationSchema;

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
    <PanelContainer>
      <Grid
        gap={1}
        align="center"
        css={{ paddingInline: theme.panel.paddingInline }}
      >
        <FieldLabel description="A meaningful label to identify this animation">
          Name
        </FieldLabel>
        <InputField
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
        align={"center"}
        css={{
          columnGap: theme.spacing[6],
          rowGap: theme.spacing[2],
          gridTemplateColumns: "1fr 1fr",
          paddingInline: theme.panel.paddingInline,
          flexShrink: 0,
        }}
      >
        <FieldLabel description="Controls how styles apply before and after the animation">
          Fill Mode
        </FieldLabel>
        <FieldLabel description="Controls how fast the animation moves at different times">
          Easing
        </FieldLabel>

        <Select
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
        css={{
          paddingInline: theme.panel.paddingInline,
        }}
      >
        <Grid
          css={{
            gridTemplateColumns: "1.1fr 2fr",
          }}
          gap={2}
          align={"center"}
        >
          <FieldLabel description="When the animation ends, based on how much of the subject is visible">
            Range End
          </FieldLabel>
          {!isScrollAnimation && (
            <ToggleGroup
              value={
                isAdvancedRangeEnd ? "advanced" : (endRangeValue ?? "advanced")
              }
              type="single"
            >
              {simplifiedEndRanges.map(
                ([toggleValue, icon, range, description], index) => (
                  <Tooltip
                    key={toggleValue}
                    content={`The animation ends ${description}`}
                    variant="wrapped"
                  >
                    <ToggleGroupButton
                      disabled={
                        !isRangeEndEnabled ||
                        (!isAdvancedRangeStart && index < startRangeIndex)
                      }
                      value={toggleValue}
                      onClick={() => {
                        setIsAdvancedRangeEnd(false);
                        handleChange(
                          {
                            ...value,
                            timing: {
                              ...value.timing,
                              rangeStart: value.timing.rangeStart,
                              rangeEnd: range,
                            },
                          },
                          false
                        );
                      }}
                    >
                      {icon}
                    </ToggleGroupButton>
                  </Tooltip>
                )
              )}

              <Tooltip content="Set custom range">
                <ToggleGroupButton
                  disabled={!isRangeEndEnabled}
                  onClick={() => {
                    setIsAdvancedRangeEnd(true);
                  }}
                  value="advanced"
                >
                  <EllipsesIcon />
                </ToggleGroupButton>
              </Tooltip>
            </ToggleGroup>
          )}
          {(isScrollAnimation || isAdvancedRangeEnd) && (
            <Grid
              css={{
                gridColumn: "2 / -1",
                gridTemplateColumns: "1.5fr 1fr",
              }}
              gap={2}
            >
              <Select
                disabled={!isRangeEndEnabled}
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
                          value.timing.rangeEnd?.[1] ?? defaultRangeEnd,
                        ],
                        rangeStart: value.timing.rangeStart,
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
                          value.timing.rangeEnd?.[1] ?? defaultRangeEnd,
                        ],
                        rangeStart: value.timing.rangeStart,
                      },
                    },
                    false
                  );
                }}
              />

              <RangeValueInput
                disabled={!isRangeEndEnabled}
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
                          value.timing.rangeEnd?.[0] ??
                            defaultTimelineRangeName,
                          rangeEnd,
                        ],
                      },
                    },
                    isEphemeral
                  );
                }}
              />
            </Grid>
          )}

          <FieldLabel description="When the animation begins, based on how much of the subject is visible">
            Range Start
          </FieldLabel>

          {!isScrollAnimation && (
            <ToggleGroup
              value={
                isAdvancedRangeStart
                  ? "advanced"
                  : (startRangeValue ?? "advanced")
              }
              type="single"
            >
              {simplifiedStartRanges.map(
                ([toggleValue, icon, range, description], index) => (
                  <Tooltip
                    key={toggleValue}
                    content={`The animation starts ${description}`}
                    variant="wrapped"
                  >
                    <ToggleGroupButton
                      key={toggleValue}
                      value={toggleValue}
                      onClick={() => {
                        setIsAdvancedRangeStart(false);
                        handleChange(
                          {
                            ...value,
                            timing: {
                              ...value.timing,
                              rangeStart: range,
                              rangeEnd:
                                endRangeIndex < index
                                  ? simplifiedEndRanges[index][2]
                                  : value.timing.rangeEnd,
                            },
                          },
                          false
                        );
                      }}
                    >
                      {icon}
                    </ToggleGroupButton>
                  </Tooltip>
                )
              )}

              <Tooltip content="Set custom range">
                <ToggleGroupButton
                  onClick={() => {
                    setIsAdvancedRangeStart(true);
                  }}
                  value="advanced"
                >
                  <EllipsesIcon />
                </ToggleGroupButton>
              </Tooltip>
            </ToggleGroup>
          )}

          {(isScrollAnimation || isAdvancedRangeStart) && (
            <Grid
              css={{
                gridColumn: "2 / -1",
                gridTemplateColumns: "1.5fr 1fr",
              }}
              gap={2}
            >
              <Select
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
                          value.timing.rangeStart?.[1] ?? defaultRangeStart,
                        ],
                        rangeEnd: value.timing.rangeEnd,
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
                          value.timing.rangeStart?.[1] ?? defaultRangeStart,
                        ],
                        rangeEnd: value.timing.rangeEnd,
                      },
                    },
                    false
                  );
                }}
              />
              <RangeValueInput
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
                          value.timing.rangeStart?.[0] ??
                            defaultTimelineRangeName,
                          rangeStart,
                        ],
                      },
                    },
                    isEphemeral
                  );
                }}
              />
            </Grid>
          )}

          <FieldLabel description="Sets a fixed duration instead of using range end.">
            Duration
          </FieldLabel>

          <DurationInput
            value={value.timing.duration}
            onChange={(duration, isEphemeral) => {
              if (duration === undefined && isEphemeral) {
                handleChange(undefined, true);
                return;
              }

              handleChange(
                {
                  ...value,
                  timing: {
                    ...value.timing,
                    duration,
                  },
                },
                isEphemeral
              );
            }}
          />
        </Grid>
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
    </PanelContainer>
  );
};
