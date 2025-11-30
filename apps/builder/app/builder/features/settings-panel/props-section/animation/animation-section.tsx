import isEqual from "fast-deep-equal";
import { forwardRef, useState, type ComponentProps } from "react";
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
  FloatingPanel,
  IconButton,
  InputField,
  Flex,
} from "@webstudio-is/design-system";
import type {
  AnimationAction,
  AnimationActionScroll,
  AnimationActionEvent,
  InsetUnitValue,
} from "@webstudio-is/sdk";
import {
  animationActionSchema,
  insetUnitValueSchema,
  RANGE_UNITS,
} from "@webstudio-is/sdk";
import {
  ArrowDownIcon,
  ArrowRightIcon,
  EllipsesIcon,
  PlusIcon,
  MinusIcon,
} from "@webstudio-is/icons";
import { toValue, type StyleValue } from "@webstudio-is/css-engine";
import {
  CssValueInput,
  type IntermediateStyleValue,
} from "~/builder/features/style-panel/shared/css-value-input";
import { humanizeString } from "~/shared/string-utils";
import { FieldLabel } from "../../property-label";
import type { PropAndMeta } from "../use-props-logic";
import { AnimationsSelect } from "./animations-select";
import { SubjectSelect } from "./subject-select";
import { TargetSelect } from "./target-select";

const animationTypeDescription: Record<AnimationAction["type"], string> = {
  scroll:
    "Scroll-based animations are triggered and controlled by the user’s scroll position.",
  view: "View-based animations occur when an element enters or exits the viewport. They rely on the element’s visibility rather than the scroll position.",
  event:
    "Command-driven animations start on user interaction (click, focus, keyboard) rather than scroll or view progress.",
};

const insetDescription =
  "Adjusts the animation’s start/end position relative to the scrollport. Positive values move it inward (delaying start or hastening end), while negative values move it outward (starting animation before visibility or continuing after disappearance).";

const animationTypes = Object.keys(
  animationTypeDescription
) as AnimationAction["type"][];

const defaultActionValue: AnimationAction = {
  type: "view",
  animations: [],
};

const defaultEventAction: AnimationAction = {
  type: "event",
  target: "self",
  triggers: [{ kind: "click" }],
  command: "play",
  animations: [],
  respectReducedMotion: true,
};

const eventCommands = [
  "play",
  "pause",
  "toggle",
  "restart",
  "reverse",
  "seek",
] as const;

const eventTriggerKinds = [
  "click",
  "dblclick",
  "pointerenter",
  "pointerleave",
  "focus",
  "blur",
  "keydown",
  "keyup",
  "command",
] as const;

const animationAxisDescription: Record<
  Exclude<NonNullable<AnimationActionScroll["axis"]>, "block" | "inline">,
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
const convertAxisToXY = (axis: NonNullable<AnimationActionScroll["axis"]>) => {
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
  value,
  onChange,
}: {
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
      styleSource="default"
      value={value}
      /* marginLeft to allow negative values  */
      property="margin-left"
      unitOptions={unitOptions}
      intermediateValue={intermediateValue}
      onChange={(styleValue) => {
        setIntermediateValue(styleValue);

        if (styleValue?.type !== "intermediate") {
          handleEphemeralChange(styleValue);
        }
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

const AnimationConfig = ({
  value,
  onChange,
}: {
  value: AnimationAction;
  onChange: ((value: AnimationAction, isEphemeral: boolean) => void) &
    ((value: undefined, isEphemeral: true) => void);
}) => {
  if (value.type === "event") {
    const triggers =
      value.triggers?.length === 0 || value.triggers === undefined
        ? defaultEventAction.triggers
        : value.triggers;

    const addTrigger = () => {
      onChange({ ...value, triggers: [...triggers, { kind: "click" }] }, false);
    };

    const updateTrigger = (
      index: number,
      trigger: AnimationActionEvent["triggers"][number]
    ) => {
      const newTriggers = [...triggers] as AnimationActionEvent["triggers"];
      newTriggers[index] = trigger;
      onChange({ ...value, triggers: newTriggers }, false);
    };

    const removeTrigger = (index: number) => {
      if (triggers.length <= 1) {
        return;
      }
      const newTriggers = [...triggers];
      newTriggers.splice(index, 1);
      onChange(
        { ...value, triggers: newTriggers as AnimationActionEvent["triggers"] },
        false
      );
    };

    const targetMode =
      value.target === undefined || value.target === "self" ? "self" : "custom";
    const targetValue =
      targetMode === "self" ? "self" : (value.target as string);

    return (
      <Grid gap={3} css={{ padding: theme.panel.padding }}>
        {/* Type selector for event animations */}
        <Grid gap={1} align="center" columns={2}>
          <FieldLabel description="Type of the timeline defines how the animation is triggered.">
            Type
          </FieldLabel>
          <Select
            options={animationTypes}
            getLabel={humanizeString}
            value={value.type}
            getDescription={(animationType) => (
              <Box css={{ width: theme.spacing[28] }}>
                {animationTypeDescription[animationType]}
              </Box>
            )}
            onChange={(typeValue) => {
              if (typeValue === "event") {
                onChange(
                  {
                    ...defaultEventAction,
                    animations: value.animations,
                  },
                  false
                );
                return;
              }
              onChange(
                {
                  type: typeValue,
                  animations: [],
                },
                false
              );
            }}
          />
        </Grid>

        <Separator />

        {/* Target Configuration Section */}
        <Grid gap={2}>
          <Text variant="titles">Target Configuration</Text>
          <Grid gap={2} columns={2} align="center">
            <FieldLabel description="Choose which element this animation affects. 'Self' animates the Animation Group's children. 'Custom' lets you select any other element on the page to animate.">
              Element
            </FieldLabel>
            <Grid gap={2}>
              <ToggleGroup
                type="single"
                value={targetMode}
                onValueChange={(mode: "self" | "custom") => {
                  if (mode === "self") {
                    onChange({ ...value, target: "self" }, false);
                    return;
                  }
                  onChange(
                    {
                      ...value,
                      target: targetValue === "self" ? "" : targetValue,
                    },
                    false
                  );
                }}
              >
                <Tooltip content="Animate the current element">
                  <ToggleGroupButton value="self">Self</ToggleGroupButton>
                </Tooltip>
                <Tooltip content="Target another element by ID or name">
                  <ToggleGroupButton value="custom">Custom</ToggleGroupButton>
                </Tooltip>
              </ToggleGroup>
              {targetMode === "custom" && (
                <TargetSelect
                  value={
                    targetValue === "self" || targetValue === ""
                      ? undefined
                      : targetValue
                  }
                  onChange={(target) => {
                    onChange({ ...value, target }, false);
                  }}
                />
              )}
            </Grid>
          </Grid>
        </Grid>

        <Separator />

        {/* Command Configuration Section */}
        <Grid gap={2}>
          <Text variant="titles">Command Configuration</Text>

          <Grid gap={2} columns={2} align="center">
            <FieldLabel description="Select the animation command to execute when the trigger fires.">
              Action
            </FieldLabel>
            <Grid gap={2}>
              <ToggleGroup
                type="single"
                value={value.command}
                css={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr 1fr",
                  gap: theme.spacing[3],
                }}
                onValueChange={(command: (typeof eventCommands)[number]) => {
                  onChange(
                    {
                      ...value,
                      command,
                      seekTo:
                        command === "seek" ? (value.seekTo ?? 0.5) : undefined,
                    },
                    false
                  );
                }}
              >
                <Tooltip content="Start playing the animation">
                  <ToggleGroupButton value="play">Play</ToggleGroupButton>
                </Tooltip>
                <Tooltip content="Pause the animation">
                  <ToggleGroupButton value="pause">Pause</ToggleGroupButton>
                </Tooltip>
                <Tooltip content="Toggle between play and pause">
                  <ToggleGroupButton value="toggle">Toggle</ToggleGroupButton>
                </Tooltip>
                <Tooltip content="Restart from the beginning">
                  <ToggleGroupButton value="restart">Restart</ToggleGroupButton>
                </Tooltip>
                <Tooltip content="Play in reverse direction">
                  <ToggleGroupButton value="reverse">Reverse</ToggleGroupButton>
                </Tooltip>
                <Tooltip content="Jump to a specific position">
                  <ToggleGroupButton value="seek">Seek</ToggleGroupButton>
                </Tooltip>
              </ToggleGroup>

              {value.command === "seek" && (
                <Grid gap={1}>
                  <Flex align="center" justify="between">
                    <Text variant="labelsSentenceCase">Position</Text>
                    <Text variant="mono">
                      {((value.seekTo ?? 0.5) * 100).toFixed(0)}%
                    </Text>
                  </Flex>
                  <InputField
                    aria-label="Seek position (0 to 1)"
                    type="number"
                    min="0"
                    max="1"
                    step="0.01"
                    value={value.seekTo ?? 0.5}
                    onChange={(event) => {
                      const seekTo = Number.parseFloat(
                        event.currentTarget.value
                      );
                      onChange(
                        {
                          ...value,
                          seekTo: Number.isNaN(seekTo)
                            ? undefined
                            : Math.min(1, Math.max(0, seekTo)),
                        },
                        false
                      );
                    }}
                  />
                </Grid>
              )}
            </Grid>
          </Grid>

          <Grid gap={2} columns={2} align="center">
            <FieldLabel description="Respects the user's system preference for reduced motion (prefers-reduced-motion). When enabled, animations are disabled for users with vestibular motion disorders, epilepsy, or motion sensitivity. Keep this ON for accessibility compliance (WCAG 2.1).">
              Respect Reduced Motion
            </FieldLabel>
            <Flex align="center" gap={2} justify="end">
              <Switch
                checked={value.respectReducedMotion ?? true}
                onCheckedChange={(respectReducedMotion) => {
                  onChange({ ...value, respectReducedMotion }, false);
                }}
              />
            </Flex>
          </Grid>
        </Grid>

        <Separator />

        {/* Trigger Configuration Section */}
        <Grid gap={2}>
          <Flex align="center" justify="between">
            <Text variant="titles">Trigger Configuration</Text>
            <Tooltip content="Add a new trigger event">
              <IconButton onClick={addTrigger} aria-label="Add trigger">
                <PlusIcon />
              </IconButton>
            </Tooltip>
          </Flex>

          <Grid gap={2}>
            {triggers.map((trigger, index) => (
              <Box
                key={`${trigger.kind}-${index}`}
                css={{
                  padding: theme.spacing[3],
                  backgroundColor: theme.colors.backgroundPanel,
                  borderRadius: theme.borderRadius[2],
                  border: `1px solid ${theme.colors.borderMain}`,
                }}
              >
                <Grid gap={2}>
                  <Flex align="center" justify="between">
                    <Select
                      options={eventTriggerKinds}
                      value={trigger.kind}
                      getLabel={(kind: (typeof eventTriggerKinds)[number]) => {
                        const labels: Record<typeof kind, string> = {
                          click: "Click",
                          dblclick: "Double Click",
                          pointerenter: "Pointer Enter",
                          pointerleave: "Pointer Leave",
                          focus: "Focus",
                          blur: "Blur",
                          keydown: "Key Down",
                          keyup: "Key Up",
                          command: "Command",
                        };
                        return labels[kind];
                      }}
                      onChange={(kind) => {
                        if (kind === "command") {
                          updateTrigger(index, { kind, command: "--" });
                        } else if (kind === "keydown" || kind === "keyup") {
                          updateTrigger(index, { kind, key: undefined });
                        } else {
                          updateTrigger(index, { kind });
                        }
                      }}
                    />

                    <Tooltip
                      content={
                        triggers.length <= 1
                          ? "At least one trigger is required"
                          : "Remove this trigger"
                      }
                    >
                      <IconButton
                        aria-label="Remove trigger"
                        disabled={triggers.length <= 1}
                        onClick={() => removeTrigger(index)}
                      >
                        <MinusIcon />
                      </IconButton>
                    </Tooltip>
                  </Flex>

                  {(trigger.kind === "keydown" || trigger.kind === "keyup") && (
                    <InputField
                      aria-label="Key to listen for"
                      placeholder="e.g., Enter, Space, Escape, a, 1"
                      value={
                        trigger.key === " " ? "Space" : (trigger.key ?? "")
                      }
                      onChange={(event) => {
                        let key = event.currentTarget.value;
                        // Convert friendly names to actual KeyboardEvent.key values
                        if (key.toLowerCase() === "space") {
                          key = " ";
                        }
                        updateTrigger(index, {
                          ...trigger,
                          key,
                        });
                      }}
                    />
                  )}

                  {trigger.kind === "command" && (
                    <InputField
                      aria-label="Command name"
                      placeholder="e.g., --play-intro, --toggle-menu"
                      value={"command" in trigger ? trigger.command : "--"}
                      onChange={(event) => {
                        let command = event.currentTarget.value;
                        // Ensure command starts with --
                        if (!command.startsWith("--")) {
                          command = `--${command.replace(/^-+/, "")}`;
                        }
                        updateTrigger(index, {
                          kind: "command",
                          command,
                        });
                      }}
                    />
                  )}
                </Grid>
              </Box>
            ))}
          </Grid>
        </Grid>
      </Grid>
    );
  }
  return (
    <Grid gap={2} css={{ padding: theme.panel.padding }}>
      <Grid gap={1} align="center" columns={2}>
        <FieldLabel description="Type of the timeline defines how the animation is triggered.">
          Type
        </FieldLabel>
        <Select
          options={animationTypes}
          getLabel={humanizeString}
          value={value.type}
          getDescription={(animationType) => (
            <Box css={{ width: theme.spacing[28] }}>
              {animationTypeDescription[animationType]}
            </Box>
          )}
          onChange={(typeValue) => {
            if (typeValue === "event") {
              onChange(
                {
                  ...defaultEventAction,
                  animations: [],
                },
                false
              );
              return;
            }
            onChange({ ...value, type: typeValue, animations: [] }, false);
          }}
        />
      </Grid>

      <Grid gap={1} align="center" columns={2}>
        <FieldLabel description="Axis determines whether an animation progresses based on an element's visibility along the horizontal or vertical direction.">
          Axis
        </FieldLabel>
        <ToggleGroup
          css={{ justifySelf: "end" }}
          type="single"
          value={convertAxisToXY(value.axis ?? ("y" as const))}
          onValueChange={(axis: keyof typeof animationAxisDescription) =>
            onChange({ ...value, axis: convertAxisToXY(axis) }, false)
          }
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
        <Grid gap={1} align="center" columns={2}>
          <FieldLabel description="The scroll source is the element whose scrolling behavior drives the animation's progress.">
            Scroll Source
          </FieldLabel>
          <Select
            options={animationSources}
            getLabel={humanizeString}
            value={value.source ?? "nearest"}
            getDescription={(animationSource) => (
              <Box css={{ width: theme.spacing[28] }}>
                {animationSourceDescriptions[animationSource]}
              </Box>
            )}
            onChange={(source) => onChange({ ...value, source }, false)}
          />
        </Grid>
      )}

      {value.type === "view" && (
        <Grid gap={1} align="center" columns={2}>
          <FieldLabel description="The subject is the element whose visibility determines the animation’s progress.">
            Subject
          </FieldLabel>
          <SubjectSelect value={value} onChange={onChange} />
        </Grid>
      )}

      {value.type === "view" && (
        <Grid gap={1} align={"center"} css={{ gridTemplateColumns: "1fr 1fr" }}>
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
            value={value.insetStart ?? { type: "keyword", value: "auto" }}
            onChange={(insetStart, isEphemeral) => {
              if (insetStart === undefined) {
                onChange(undefined, true);
                return;
              }
              onChange({ ...value, insetStart }, isEphemeral);
            }}
          />
          <InsetValueInput
            value={value.insetEnd ?? { type: "keyword", value: "auto" }}
            onChange={(insetEnd, isEphemeral) => {
              if (insetEnd === undefined) {
                onChange(undefined, true);
                return;
              }
              onChange({ ...value, insetEnd }, isEphemeral);
            }}
          />
        </Grid>
      )}
    </Grid>
  );
};

const AnimationConfigButton = forwardRef<
  HTMLButtonElement,
  Omit<ComponentProps<typeof IconButton>, "value" | "onChange"> & {
    value: AnimationAction;
    onChange: ((value: AnimationAction, isEphemeral: boolean) => void) &
      ((value: undefined, isEphemeral: true) => void);
  }
>(({ value, onChange, ...props }, ref) => {
  const baseDefault =
    value.type === "event" ? defaultEventAction : defaultActionValue;
  const { animations: defaultAnimations, ...defaultValue } = baseDefault;
  const { animations, ...newValue } = value;
  return (
    <Tooltip content="Advanced transform options">
      <IconButton
        {...props}
        ref={ref}
        variant={isEqual(defaultValue, newValue) ? "default" : "local"}
        onClick={(event) => {
          if (event.altKey) {
            onChange(defaultActionValue, false);
            return;
          }
          props.onClick?.(event);
        }}
      >
        <EllipsesIcon />
      </IconButton>
    </Tooltip>
  );
});

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
  const { prop } = animationAction;

  const value: AnimationAction =
    prop?.type === "animationAction" ? prop.value : defaultActionValue;

  const currentValue: AnimationAction =
    value.type === "event"
      ? {
          ...defaultEventAction,
          ...value,
          triggers:
            value.triggers?.length && value.triggers.length > 0
              ? value.triggers
              : defaultEventAction.triggers,
        }
      : value;

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
      <Grid gap={2} css={{ padding: theme.panel.paddingInline }}>
        <Grid gap={2} align="center" css={{ gridTemplateColumns: "1fr auto" }}>
          <FieldLabel description="Even if its off, you can preview the animation by selecting the item in the navigator.">
            Run on canvas
          </FieldLabel>
          <Tooltip content={currentValue.isPinned ? "Off" : "On"}>
            <Switch
              checked={currentValue.isPinned ?? false}
              onCheckedChange={(isPinned) => {
                handleChange({ ...currentValue, isPinned }, false);
              }}
            />
          </Tooltip>
        </Grid>

        <Grid gap={2} align="center" css={{ gridTemplateColumns: "1fr auto" }}>
          <FieldLabel description="Debug mode shows animation progress on canvas in design mode only.">
            Debug
          </FieldLabel>
          <Switch
            css={{ justifySelf: "end" }}
            checked={currentValue.debug ?? false}
            onCheckedChange={(debug) => {
              handleChange({ ...currentValue, debug }, false);
            }}
          />
        </Grid>
      </Grid>

      <Separator />

      <Grid gap={2}>
        <AnimationsSelect
          action={
            <FloatingPanel
              title="Advanced Animation"
              placement="bottom"
              content={
                <AnimationConfig value={currentValue} onChange={handleChange} />
              }
            >
              <AnimationConfigButton
                value={currentValue}
                onChange={handleChange}
              />
            </FloatingPanel>
          }
          value={currentValue}
          onChange={handleChange}
          isAnimationEnabled={isAnimationEnabled}
          selectedBreakpointId={selectedBreakpointId}
        />
      </Grid>
    </Grid>
  );
};
