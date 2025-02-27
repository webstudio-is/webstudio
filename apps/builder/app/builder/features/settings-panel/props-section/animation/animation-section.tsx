import {
  Grid,
  theme,
  Select,
  Label,
  Separator,
  Box,
  toast,
  ToggleGroup,
  Tooltip,
  ToggleGroupButton,
  Text,
  Switch,
  SmallToggleButton,
} from "@webstudio-is/design-system";
import { useIds } from "~/shared/form-utils";
import type { PropAndMeta } from "../use-props-logic";
import type {
  AnimationAction,
  AnimationActionScroll,
  InsetUnitValue,
} from "@webstudio-is/sdk";
import { toPascalCase } from "~/builder/features/style-panel/shared/keyword-utils";
import {
  animationActionSchema,
  insetUnitValueSchema,
  RANGE_UNITS,
} from "@webstudio-is/sdk";
import { BugIcon, RepeatColumnIcon, RepeatRowIcon } from "@webstudio-is/icons";
import { AnimationsSelect } from "./animations-select";
import { SubjectSelect } from "./subject-select";
import { toValue, type StyleValue } from "@webstudio-is/css-engine";
import {
  CssValueInput,
  type IntermediateStyleValue,
} from "~/builder/features/style-panel/shared/css-value-input";
import { useState } from "react";

const animationTypeDescription: Record<AnimationAction["type"], string> = {
  scroll:
    "Scroll-based animations are triggered and controlled by the user’s scroll position.",
  view: "View-based animations occur when an element enters or exits the viewport. They rely on the element’s visibility rather than the scroll position.",
};

const animationTypes: AnimationAction["type"][] = Object.keys(
  animationTypeDescription
) as AnimationAction["type"][];

const defaultActionValue: AnimationAction = {
  type: "view",
  animations: [],
};

const animationAxisDescription: Record<
  NonNullable<AnimationAction["axis"]>,
  { icon: React.ReactNode; label: string; description: React.ReactNode }
> = {
  block: {
    icon: <RepeatColumnIcon />,
    label: "Block axis",
    description:
      "Uses the scroll progress along the block axis (depends on writing mode, usually vertical in English).",
  },
  inline: {
    icon: <RepeatRowIcon />,
    label: "Inline axis",
    description:
      "Uses the scroll progress along the inline axis (depends on writing mode, usually horizontal in English).",
  },
  y: {
    label: "Y axis",
    icon: <RepeatColumnIcon />,
    description:
      "Always maps to the vertical scroll direction, regardless of writing mode.",
  },
  x: {
    label: "X axis",
    icon: <RepeatRowIcon />,
    description:
      "Always maps to the horizontal scroll direction, regardless of writing mode.",
  },
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
  onChange: (value: InsetUnitValue) => void;
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
      property={"marginLeft"}
      unitOptions={unitOptions}
      intermediateValue={intermediateValue}
      onChange={(styleValue) => {
        setIntermediateValue(styleValue);
        /* @todo: allow to change some ephemeral property to see the result in action */
      }}
      getOptions={() => [
        {
          value: "auto",
          type: "keyword",
          description:
            "Pick the child element’s viewTimelineInset property or use the scrolling element’s scroll-padding, depending on the selected axis.",
        },
      ]}
      onHighlight={() => {
        /* Nothing to Highlight */
      }}
      onChangeComplete={(event) => {
        const parsedValue = insetUnitValueSchema.safeParse(event.value);
        if (parsedValue.success) {
          onChange(parsedValue.data);
          setIntermediateValue(undefined);
          return;
        }

        setIntermediateValue({
          type: "invalid",
          value: toValue(event.value),
        });
      }}
      onAbort={() => {
        /* @todo: allow to change some ephemeral property to see the result in action */
      }}
      onReset={() => {
        setIntermediateValue(undefined);
      }}
    />
  );
};

const animationSources = Object.keys(
  animationSourceDescriptions
) as NonNullable<AnimationActionScroll["source"]>[];

export const AnimateSection = ({
  animationAction,
  onChange,
}: {
  animationAction: PropAndMeta;
  onChange: (value: AnimationAction) => void;
}) => {
  const fieldIds = useIds([
    "type",
    "subject",
    "source",
    "insetStart",
    "insetEnd",
  ] as const);

  const { prop } = animationAction;

  const value: AnimationAction =
    prop?.type === "animationAction" ? prop.value : defaultActionValue;

  const handleChange = (value: unknown) => {
    const parsedValue = animationActionSchema.safeParse(value);
    if (parsedValue.success) {
      onChange(parsedValue.data);
      return;
    }

    toast.error("Schemas are incompatible, try fix");
  };

  return (
    <Grid
      css={{
        paddingBottom: theme.panel.paddingBlock,
      }}
    >
      <Box css={{ height: theme.panel.paddingBlock }} />

      <Separator />

      <Grid
        gap={2}
        align={"center"}
        css={{
          gridTemplateColumns: "1fr auto auto",
          padding: theme.panel.paddingInline,
        }}
      >
        <Text variant={"titles"}>Animation</Text>

        <Tooltip
          content={
            value.debug ? (
              "Stop Debugging"
            ) : (
              <Text>
                Debug <small>(experimental)</small>
              </Text>
            )
          }
        >
          <SmallToggleButton
            css={
              value.debug
                ? {
                    color: theme.colors.foregroundDestructive,
                    "&:hover": {
                      color: theme.colors.foregroundDestructive,
                      opacity: 0.8,
                    },
                  }
                : undefined
            }
            pressed={value.debug ?? false}
            onPressedChange={() => {
              handleChange({ ...value, debug: !value.debug });
            }}
            variant="normal"
            tabIndex={-1}
            icon={<BugIcon />}
          />
        </Tooltip>

        <Tooltip content={value.isPinned ? "Unpin Animation" : "Pin Animation"}>
          <Switch
            checked={value.isPinned ?? false}
            onCheckedChange={(isPinned) => {
              handleChange({ ...value, isPinned });
            }}
          />
        </Tooltip>
      </Grid>

      <Separator />

      <Box css={{ height: theme.panel.paddingBlock }} />
      <Grid gap={2} css={{ paddingInline: theme.panel.paddingInline }}>
        <Grid gap={1} align={"center"} css={{ gridTemplateColumns: "1fr 1fr" }}>
          <Label htmlFor={fieldIds.type}>Action</Label>
          <Select
            id={fieldIds.type}
            options={animationTypes}
            getLabel={(animationType: AnimationAction["type"]) =>
              toPascalCase(animationType)
            }
            value={value.type}
            getDescription={(animationType: AnimationAction["type"]) => (
              <Box
                css={{
                  width: theme.spacing[28],
                }}
              >
                {animationTypeDescription[animationType]}
              </Box>
            )}
            onChange={(typeValue) => {
              handleChange({ ...value, type: typeValue, animations: [] });
            }}
          />
        </Grid>

        <Grid gap={1} align={"center"} css={{ gridTemplateColumns: "1fr 1fr" }}>
          <Label>Axis</Label>
          <ToggleGroup
            type="single"
            value={value.axis ?? ("block" as const)}
            onValueChange={(axis) => {
              handleChange({ ...value, axis });
            }}
          >
            {Object.entries(animationAxisDescription).map(
              ([key, { icon, label, description }]) => (
                <Tooltip
                  key={key}
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
            <Label htmlFor={fieldIds.source}>Scroll Source</Label>

            <Select
              id={fieldIds.source}
              options={animationSources}
              getLabel={(
                animationSource: NonNullable<AnimationActionScroll["source"]>
              ) => toPascalCase(animationSource)}
              value={value.source ?? "nearest"}
              getDescription={(
                animationSource: NonNullable<AnimationActionScroll["source"]>
              ) => (
                <Box
                  css={{
                    width: theme.spacing[28],
                  }}
                >
                  {animationSourceDescriptions[animationSource]}
                </Box>
              )}
              onChange={(source) => {
                handleChange({ ...value, source });
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
            <Label htmlFor={fieldIds.subject}>Subject</Label>
            <SubjectSelect
              id={fieldIds.subject}
              value={value}
              onChange={onChange}
            />
          </Grid>
        )}

        {value.type === "view" && (
          <Grid
            gap={1}
            align={"center"}
            css={{ gridTemplateColumns: "1fr 1fr" }}
          >
            <Label htmlFor={fieldIds.insetStart}>
              {value.axis === "inline" || value.axis === "x"
                ? "Left Inset"
                : "Top Inset"}
            </Label>
            <Label htmlFor={fieldIds.insetEnd}>
              {value.axis === "inline" || value.axis === "x"
                ? "Right Inset"
                : "Bottom Inset"}
            </Label>
            <InsetValueInput
              id={fieldIds.insetStart}
              value={value.insetStart ?? { type: "keyword", value: "auto" }}
              onChange={(insetStart) => {
                handleChange({ ...value, insetStart });
              }}
            />
            <InsetValueInput
              id={fieldIds.insetEnd}
              value={value.insetEnd ?? { type: "keyword", value: "auto" }}
              onChange={(insetEnd) => {
                handleChange({ ...value, insetEnd });
              }}
            />
          </Grid>
        )}

        <AnimationsSelect value={value} onChange={onChange} />
      </Grid>
    </Grid>
  );
};
