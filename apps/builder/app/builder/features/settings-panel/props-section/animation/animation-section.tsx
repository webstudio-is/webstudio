import { useState } from "react";
import {
  Grid,
  theme,
  Select,
  Separator,
  Box,
  toast,
  ToggleGroup,
  Tooltip,
  ToggleGroupButton,
  Text,
  Switch,
} from "@webstudio-is/design-system";
import { useIds } from "~/shared/form-utils";
import type { PropAndMeta } from "../use-props-logic";
import type {
  AnimationAction,
  AnimationActionScroll,
  InsetUnitValue,
} from "@webstudio-is/sdk";
import {
  animationActionSchema,
  insetUnitValueSchema,
  RANGE_UNITS,
} from "@webstudio-is/sdk";
import { ArrowDownIcon, ArrowRightIcon } from "@webstudio-is/icons";
import { AnimationsSelect } from "./animations-select";
import { SubjectSelect } from "./subject-select";
import { toValue, type StyleValue } from "@webstudio-is/css-engine";
import {
  CssValueInput,
  type IntermediateStyleValue,
} from "~/builder/features/style-panel/shared/css-value-input";
import { humanizeString } from "~/shared/string-utils";
import { FieldLabel } from "../../property-label";

const animationTypeDescription: Record<AnimationAction["type"], string> = {
  scroll:
    "Scroll-based animations are triggered and controlled by the user’s scroll position.",
  view: "View-based animations occur when an element enters or exits the viewport. They rely on the element’s visibility rather than the scroll position.",
};

const insetDescription =
  "Adjusts the animation’s start/end position relative to the scrollport. Positive values move it inward (delaying start or hastening end), while negative values move it outward (starting animation before visibility or continuing after disappearance).";

const animationTypes: AnimationAction["type"][] = Object.keys(
  animationTypeDescription
) as AnimationAction["type"][];

const defaultActionValue: AnimationAction = {
  type: "view",
  animations: [],
};

const animationAxisDescription: Record<
  Exclude<NonNullable<AnimationAction["axis"]>, "block" | "inline">,
  { icon: React.ReactNode; label: string; description: React.ReactNode }
> = {
  /*
  // We decided to not support block and inline axis, as mostly not used
  block: {
    icon: <ArrowDownIcon />,
    label: "Block axis",
    description:
      "Uses the scroll progress along the block axis (depends on writing mode, usually vertical in English).",
  },
  inline: {
    icon: <ArrowRightIcon />,
    label: "Inline axis",
    description:
      "Uses the scroll progress along the inline axis (depends on writing mode, usually horizontal in English).",
  },
  */

  y: {
    label: "Y axis",
    icon: <ArrowDownIcon />,
    description: "The scrollbar on the vertical axis of the scroller element.",
  },
  x: {
    label: "X axis",
    icon: <ArrowRightIcon />,
    description:
      "The scrollbar on the horizontal axis of the scroller element.",
  },
};

/**
 * Support for block and inline axis is removed, as it is not widely used.
 */
const convertAxisToXY = (axis: NonNullable<AnimationAction["axis"]>) => {
  switch (axis) {
    case "block":
      return "y";
    case "inline":
      return "x";
    default:
      return axis;
  }
};

const animationSourceDescriptions: Record<
  NonNullable<AnimationActionScroll["source"]>,
  string
> = {
  nearest: "Selects the scrolling container that affects the current element.",
  root: "Selects the scrolling element of the document.",
  closest: "Selects the nearest ancestor element that is scrollable.",
};

const unitOptions = RANGE_UNITS.map((unit) => ({
  id: unit,
  label: unit,
  type: "unit" as const,
}));

const InsetValueInput = ({
  id,
  value,
  onChange,
}: {
  id: string;
  value: InsetUnitValue;
  onChange: ((value: undefined, isEphemeral: true) => void) &
    ((value: InsetUnitValue, isEphemeral: boolean) => void);
}) => {
  const [intermediateValue, setIntermediateValue] = useState<
    StyleValue | IntermediateStyleValue
  >();

  const handleEphemeralChange = (styleValue: unknown | undefined) => {
    if (styleValue === undefined) {
      onChange(undefined, true);
      return;
    }

    const parsedResult = insetUnitValueSchema.safeParse(styleValue);

    if (parsedResult.success) {
      onChange(parsedResult.data, true);
      return;
    }

    onChange(undefined, true);
  };

  return (
    <CssValueInput
      id={id}
      styleSource="default"
      value={value}
      /* marginLeft to allow negative values  */
      property="margin-left"
      unitOptions={unitOptions}
      intermediateValue={intermediateValue}
      onChange={(styleValue) => {
        setIntermediateValue(styleValue);
        handleEphemeralChange(styleValue);
      }}
      getOptions={() => [
        {
          value: "auto",
          type: "keyword",
          description:
            "Pick the child element’s viewTimelineInset property or use the scrolling element’s scroll-padding, depending on the selected axis.",
        },
      ]}
      onHighlight={(value) => {
        handleEphemeralChange(value);
      }}
      onChangeComplete={(event) => {
        const parsedValue = insetUnitValueSchema.safeParse(event.value);
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
        handleEphemeralChange(undefined);
      }}
      onReset={() => {
        handleEphemeralChange(undefined);
        setIntermediateValue(undefined);
      }}
    />
  );
};

const animationSources = Object.keys(
  animationSourceDescriptions
) as NonNullable<AnimationActionScroll["source"]>[];

export const AnimationSection = ({
  animationAction,
  onChange,
  isAnimationEnabled,
  selectedBreakpointId,
}: {
  animationAction: PropAndMeta;
  onChange: ((value: undefined, isEphemeral: true) => void) &
    ((value: AnimationAction, isEphemeral: boolean) => void);
  isAnimationEnabled: (
    enabled: [breakpointId: string, enabled: boolean][] | undefined
  ) => boolean | undefined;
  selectedBreakpointId: string;
}) => {
  const fieldIds = useIds([
    "type",
    "subject",
    "source",
    "insetStart",
    "insetEnd",
    "debug",
  ] as const);

  const { prop } = animationAction;

  const value: AnimationAction =
    prop?.type === "animationAction" ? prop.value : defaultActionValue;

  const handleChange = (value: unknown, isEphemeral: boolean) => {
    if (value === undefined && isEphemeral) {
      onChange(undefined, isEphemeral);
      return;
    }

    const parsedValue = animationActionSchema.safeParse(value);
    if (parsedValue.success) {
      onChange(parsedValue.data, isEphemeral);
      return;
    }

    toast.error("Invalid animation schema.");
  };

  return (
    <Grid css={{ paddingBottom: theme.panel.paddingBlock }}>
      <Grid
        gap={2}
        align={"center"}
        css={{
          gridTemplateColumns: "1fr auto",
          padding: theme.panel.paddingInline,
        }}
      >
        <FieldLabel description="Even if its off, you can preview the animation by selecting the item in the instance.">
          Run on canvas
        </FieldLabel>
        <Tooltip content={value.isPinned ? "Off" : "On"}>
          <Switch
            checked={value.isPinned ?? false}
            onCheckedChange={(isPinned) => {
              handleChange({ ...value, isPinned }, false);
            }}
          />
        </Tooltip>
      </Grid>

      <Separator />

      <Box css={{ height: theme.panel.paddingBlock }} />
      <Grid gap={2} css={{ paddingInline: theme.panel.paddingInline }}>
        <Grid gap={1} align={"center"} css={{ gridTemplateColumns: "1fr 1fr" }}>
          <FieldLabel description="Type of the timeline defines how the animation is triggered.">
            Type
          </FieldLabel>
          <Select
            id={fieldIds.type}
            options={animationTypes}
            getLabel={humanizeString}
            value={value.type}
            getDescription={(animationType: AnimationAction["type"]) => (
              <Box css={{ width: theme.spacing[28] }}>
                {animationTypeDescription[animationType]}
              </Box>
            )}
            onChange={(typeValue) => {
              handleChange(
                { ...value, type: typeValue, animations: [] },
                false
              );
            }}
          />
        </Grid>

        <Grid gap={1} align={"center"} css={{ gridTemplateColumns: "1fr 1fr" }}>
          <FieldLabel description="Axis determines whether an animation progresses based on an element’s visibility along the horizontal or vertical direction.">
            Axis
          </FieldLabel>
          <ToggleGroup
            css={{ justifySelf: "end" }}
            type="single"
            value={convertAxisToXY(value.axis ?? ("y" as const))}
            onValueChange={(axis: keyof typeof animationAxisDescription) => {
              handleChange({ ...value, axis: convertAxisToXY(axis) }, false);
            }}
          >
            {Object.entries(animationAxisDescription).map(
              ([key, { icon, label, description }]) => (
                <Tooltip
                  key={key}
                  variant="wrapped"
                  content={
                    <Grid gap={1}>
                      <Text variant={"titles"}>{label}</Text>
                      <Text>{description}</Text>
                    </Grid>
                  }
                >
                  <ToggleGroupButton value={key}>{icon}</ToggleGroupButton>
                </Tooltip>
              )
            )}
          </ToggleGroup>
        </Grid>

        {value.type === "scroll" && (
          <Grid
            gap={1}
            align={"center"}
            css={{ gridTemplateColumns: "1fr 1fr" }}
          >
            <FieldLabel description="The scroll source is the element whose scrolling behavior drives the animation's progress.">
              Scroll Source
            </FieldLabel>
            <Select
              id={fieldIds.source}
              options={animationSources}
              getLabel={humanizeString}
              value={value.source ?? "nearest"}
              getDescription={(
                animationSource: NonNullable<AnimationActionScroll["source"]>
              ) => (
                <Box css={{ width: theme.spacing[28] }}>
                  {animationSourceDescriptions[animationSource]}
                </Box>
              )}
              onChange={(source) => {
                handleChange({ ...value, source }, false);
              }}
            />
          </Grid>
        )}

        {value.type === "view" && (
          <Grid
            gap={1}
            align={"center"}
            css={{ gridTemplateColumns: "1fr 1fr" }}
          >
            <FieldLabel description="The subject is the element whose visibility determines the animation’s progress.">
              Subject
            </FieldLabel>
            <SubjectSelect
              id={fieldIds.subject}
              value={value}
              onChange={handleChange}
            />
          </Grid>
        )}

        {value.type === "view" && (
          <Grid
            gap={1}
            align={"center"}
            css={{ gridTemplateColumns: "1fr 1fr" }}
          >
            <FieldLabel description={insetDescription}>
              {value.axis === "inline" || value.axis === "x"
                ? "Left Inset"
                : "Top Inset"}
            </FieldLabel>
            <FieldLabel description={insetDescription}>
              {value.axis === "inline" || value.axis === "x"
                ? "Right Inset"
                : "Bottom Inset"}
            </FieldLabel>
            <InsetValueInput
              id={fieldIds.insetStart}
              value={value.insetStart ?? { type: "keyword", value: "auto" }}
              onChange={(insetStart, isEphemeral) => {
                handleChange({ ...value, insetStart }, isEphemeral);
              }}
            />
            <InsetValueInput
              id={fieldIds.insetEnd}
              value={value.insetEnd ?? { type: "keyword", value: "auto" }}
              onChange={(insetEnd, isEphemeral) => {
                handleChange({ ...value, insetEnd }, isEphemeral);
              }}
            />
          </Grid>
        )}

        <Grid gap={1} align={"center"} css={{ gridTemplateColumns: "2fr 1fr" }}>
          <FieldLabel description="Debug mode shows animation progress on canvas in design mode only.">
            Debug
          </FieldLabel>
          <Switch
            css={{ justifySelf: "end" }}
            id={fieldIds.debug}
            checked={value.debug ?? false}
            onCheckedChange={(debug) => {
              handleChange({ ...value, debug }, false);
            }}
          />
        </Grid>
      </Grid>
      <Grid gap={2}>
        <AnimationsSelect
          value={value}
          onChange={handleChange}
          isAnimationEnabled={isAnimationEnabled}
          selectedBreakpointId={selectedBreakpointId}
        />
      </Grid>
    </Grid>
  );
};
