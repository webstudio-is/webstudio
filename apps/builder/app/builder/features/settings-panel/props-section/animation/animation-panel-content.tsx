import { useState, type ReactNode } from "react";
import {
  Box,
  EnhancedTooltip,
  Grid,
  IconButton,
  InputField,
  Label,
  ScrollArea,
  Select,
  SmallToggleButton,
  theme,
  toast,
  ToggleGroup,
  ToggleGroupButton,
} from "@webstudio-is/design-system";
import { keywordValues } from "@webstudio-is/css-data";
import { useIds } from "~/shared/form-utils";

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
  Link2Icon,
  Link2UnlinkedIcon,
  RangeContain50Icon,
  RangeEntry0Icon,
  RangeEntry100Icon,
  RangeEntry50Icon,
  RangeExit0Icon,
  RangeExit100Icon,
  RangeExit50Icon,
} from "@webstudio-is/icons";
import { $availableUnitVariables } from "~/builder/features/style-panel/shared/model";
import isEqual from "fast-deep-equal";

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
  disabled,
}: {
  id: string;
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
      id={id}
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
  id,
  value,
  onChange,
}: {
  id: string;
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
      id={id}
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

const RangesAdvancedPanel = ({
  value,
  type,
  onChange,
}: AnimationPanelContentProps) => {
  const [isLinked, setIsLinked] = useState(
    value.timing.rangeStart?.[0] === value.timing.rangeEnd?.[0]
  );

  const fieldIds = useIds([
    "rangeStartName",
    "rangeStartValue",
    "rangeEndName",
    "rangeEndValue",
    "duration",
  ] as const);

  const timelineRangeDescriptions =
    type === "scroll" ? scrollTimelineRangeName : viewTimelineRangeName;

  const timelineRangeNames = Object.keys(timelineRangeDescriptions);

  const isRangeEndEnabled = value.timing.duration === undefined;

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

  return (
    <Grid
      gap={1}
      align={"center"}
      css={{
        gridTemplateColumns: "1fr 16px 1fr",
        flexShrink: 0,
      }}
    >
      <Label htmlFor={fieldIds.rangeStartName}>Start</Label>
      <div />
      <Label disabled={!isRangeEndEnabled} htmlFor={fieldIds.rangeEndName}>
        End
      </Label>

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
                  value.timing.rangeStart?.[1] ?? defaultRangeStart,
                ],
                rangeEnd: isLinked
                  ? [
                      timelineRangeName,
                      value.timing.rangeEnd?.[1] ?? defaultRangeEnd,
                    ]
                  : value.timing.rangeEnd,
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
                rangeEnd: isLinked
                  ? [
                      timelineRangeName,
                      value.timing.rangeEnd?.[1] ?? defaultRangeEnd,
                    ]
                  : value.timing.rangeEnd,
              },
            },
            false
          );
        }}
      />
      <Grid>
        <EnhancedTooltip
          content={isLinked ? "Unlink range names" : "Link range names"}
        >
          <SmallToggleButton
            pressed={isLinked}
            onPressedChange={(pressed) => {
              setIsLinked(pressed);
              if (pressed) {
                handleChange(
                  {
                    ...value,
                    timing: {
                      ...value.timing,
                      rangeEnd: pressed
                        ? [
                            value.timing.rangeStart?.[0] ?? "entry",
                            value.timing.rangeEnd?.[1] ?? defaultRangeEnd,
                          ]
                        : value.timing.rangeEnd,
                    },
                  },
                  false
                );
              }
            }}
            variant="normal"
            icon={isLinked ? <Link2Icon /> : <Link2UnlinkedIcon />}
          />
        </EnhancedTooltip>
      </Grid>
      <Select
        id={fieldIds.rangeEndName}
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
                rangeStart: isLinked
                  ? [
                      timelineRangeName,
                      value.timing.rangeStart?.[1] ?? defaultRangeStart,
                    ]
                  : value.timing.rangeStart,
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
                rangeStart: isLinked
                  ? [
                      timelineRangeName,
                      value.timing.rangeStart?.[1] ?? defaultRangeStart,
                    ]
                  : value.timing.rangeStart,
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
      <div />
      <RangeValueInput
        id={fieldIds.rangeEndValue}
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
  );
};

const simplifiedRanges = [
  [
    "entry 0%",
    RangeEntry0Icon,
    ["entry", { type: "unit", unit: "%", value: 0 }],
  ],
  [
    "entry 50%",
    RangeEntry50Icon,
    ["entry", { type: "unit", unit: "%", value: 50 }],
  ],
  [
    "entry 100%",
    RangeEntry100Icon,
    ["entry", { type: "unit", unit: "%", value: 100 }],
  ],
  [
    "contain 50%",
    RangeContain50Icon,
    ["contain", { type: "unit", unit: "%", value: 50 }],
  ],
  ["exit 0%", RangeExit0Icon],
  ["exit", { type: "unit", unit: "%", value: 0 }],
  [
    "exit 50%",
    RangeExit50Icon,
    ["exit", { type: "unit", unit: "%", value: 50 }],
  ],
  [
    "exit 100%",
    RangeExit100Icon,
    ["exit", { type: "unit", unit: "%", value: 100 }],
  ],
] as const;

const simplifiedStartRanges = simplifiedRanges.slice(0, -1);
const simplifiedEndRanges = simplifiedRanges.slice(1);

export const AnimationPanelContent = ({
  onChange,
  value,
  type,
}: AnimationPanelContentProps) => {
  const fieldIds = useIds(["fill", "easing", "name", "duration"] as const);

  const simplifiedRangeStartValue = simplifiedStartRanges.find(([, , range]) =>
    isEqual(range, value.timing.rangeStart ?? defaultRangeStart)
  );

  const simplifiedRangeEndValue = simplifiedEndRanges.find(([, , range]) =>
    isEqual(range, value.timing.rangeEnd ?? defaultRangeEnd)
  );

  const [isAdvancedRangeView, setIsAdvancedRangeView] = useState(() => {
    if (type === "scroll") {
      return true;
    }
    if (
      simplifiedRangeStartValue === undefined ||
      simplifiedRangeEndValue === undefined
    ) {
      return true;
    }

    return false;
  });

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
    <PanelContainer>
      <Grid
        gap={1}
        align="center"
        css={{ paddingInline: theme.panel.paddingInline }}
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
        css={{
          paddingInline: theme.panel.paddingInline,
        }}
      >
        <Grid
          css={{
            gridTemplateColumns: "1fr auto",
          }}
        >
          <Label text="title">Ranges</Label>

          <IconButton
            // variant={isEqual(defaultValue, newValue) ? "default" : "local"}
            onClick={() => setIsAdvancedRangeView((prev) => !prev)}
            state={isAdvancedRangeView ? "open" : undefined}
          >
            <EllipsesIcon />
          </IconButton>
        </Grid>

        {isAdvancedRangeView ? (
          <RangesAdvancedPanel
            onChange={handleChange}
            value={value}
            type={type}
          />
        ) : (
          <Grid
            css={{
              gridTemplateColumns: "auto 1fr",
            }}
            gap={1}
            align={"center"}
          >
            <Label>End</Label>
            <ToggleGroup css={{ justifySelf: "end" }} type="single">
              <ToggleGroupButton value="2" disabled>
                <RangeEntry50Icon />
              </ToggleGroupButton>
              <ToggleGroupButton value="3" disabled>
                <RangeEntry100Icon />
              </ToggleGroupButton>

              <ToggleGroupButton value="4">
                <RangeContain50Icon />
              </ToggleGroupButton>

              <ToggleGroupButton value="5">
                <RangeExit0Icon />
              </ToggleGroupButton>

              <ToggleGroupButton value="6">
                <RangeExit50Icon />
              </ToggleGroupButton>
              <ToggleGroupButton value="7">
                <RangeExit100Icon />
              </ToggleGroupButton>
            </ToggleGroup>

            <Label>Start</Label>
            <ToggleGroup css={{ justifySelf: "end" }} type="single">
              <ToggleGroupButton value="1">
                <RangeEntry0Icon />
              </ToggleGroupButton>
              <ToggleGroupButton value="2">
                <RangeEntry50Icon />
              </ToggleGroupButton>
              <ToggleGroupButton value="3">
                <RangeEntry100Icon />
              </ToggleGroupButton>

              <ToggleGroupButton value="4">
                <RangeContain50Icon />
              </ToggleGroupButton>

              <ToggleGroupButton value="5">
                <RangeExit0Icon />
              </ToggleGroupButton>

              <ToggleGroupButton value="6">
                <RangeExit50Icon />
              </ToggleGroupButton>
            </ToggleGroup>
          </Grid>
        )}

        <Grid
          gap={1}
          align={"center"}
          css={{
            gridTemplateColumns: "1fr 1fr",
          }}
        >
          <Label htmlFor={fieldIds.duration}>Duration</Label>
          <DurationInput
            id={fieldIds.duration}
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
