import { useMemo } from "react";
import { useStore } from "@nanostores/react";
import {
  Box,
  Grid,
  InputField,
  Select,
  Text,
  theme,
} from "@webstudio-is/design-system";
import { type Invoker, isCompleteInvoker } from "@webstudio-is/sdk";
import { $instances } from "~/shared/nano-states";
import { type ControlProps, ResponsiveLayout } from "../shared";
import { FieldLabel, PropertyLabel } from "../property-label";

/**
 * Hook to find all AnimateChildren instances in the project
 */
const useAnimationGroups = () => {
  const instances = useStore($instances);
  return useMemo(() => {
    const groups: Array<{ id: string; label: string }> = [];
    for (const [id, instance] of instances) {
      if (
        instance.component ===
        "@webstudio-is/sdk-components-animation:AnimateChildren"
      ) {
        groups.push({ id, label: `Animation Group` });
      }
    }
    return groups;
  }, [instances]);
};

const defaultValue: Invoker = {
  targetInstanceId: "",
  command: "--",
};

/**
 * Invoker Control - enables HTML Invoker Commands for triggering animations
 *
 * This creates the connection between a button and an Animation Group.
 * When clicked, the button will dispatch a command event to the target.
 *
 * @see https://developer.mozilla.org/en-US/docs/Web/API/Invoker_Commands_API
 */
export const InvokerControl = ({
  prop,
  propName,
  onChange,
}: ControlProps<"invoker">) => {
  const animationGroups = useAnimationGroups();

  const value: Invoker = prop?.type === "invoker" ? prop.value : defaultValue;

  const handleChange = (updates: Partial<Invoker>) => {
    const newValue = { ...value, ...updates };
    // Ensure command always starts with --
    if (updates.command !== undefined && !updates.command.startsWith("--")) {
      newValue.command = `--${updates.command.replace(/^-+/, "")}`;
    }
    onChange({
      type: "invoker",
      value: newValue,
    });
  };

  // Show message if no Animation Groups exist
  if (animationGroups.length === 0) {
    return (
      <ResponsiveLayout label={<PropertyLabel name={propName} />}>
        <Text color="subtle" css={{ paddingBlock: theme.spacing[3] }}>
          Add an Animation Group to use Invoker
        </Text>
      </ResponsiveLayout>
    );
  }

  const targetOptions = animationGroups.map((g) => g.id);

  // Get display value without -- prefix for cleaner input
  const commandDisplayValue = value.command.startsWith("--")
    ? value.command.slice(2)
    : value.command;

  const isValid = isCompleteInvoker(value);

  return (
    <Grid gap={2}>
      {/* Main Property Label with Delete functionality */}
      <ResponsiveLayout label={<PropertyLabel name={propName} />}>
        <Text color="subtle">
          {isValid ? `command="${value.command}"` : "Configure below"}
        </Text>
      </ResponsiveLayout>

      {/* Target Animation Group */}
      <ResponsiveLayout
        label={
          <FieldLabel description="Select which Animation Group receives this command">
            Target
          </FieldLabel>
        }
      >
        <Box css={{ minWidth: 0 }}>
          <Select
            options={targetOptions}
            getLabel={(id) => {
              const index = animationGroups.findIndex((g) => g.id === id);
              return index >= 0 ? `Animation Group ${index + 1}` : "Select";
            }}
            value={value.targetInstanceId || undefined}
            onChange={(targetInstanceId) => {
              handleChange({ targetInstanceId });
            }}
            placeholder="Select target"
          />
        </Box>
      </ResponsiveLayout>

      {/* Command Name */}
      <ResponsiveLayout
        label={
          <FieldLabel description="Command name that triggers the animation. Must match the command in Animation Group.">
            Command
          </FieldLabel>
        }
      >
        <InputField
          value={commandDisplayValue}
          placeholder="play-intro"
          prefix={<Text color="subtle">--</Text>}
          onChange={(event) => {
            const sanitized = event.target.value
              .toLowerCase()
              .replace(/\s+/g, "-")
              .replace(/[^a-z0-9-]/g, "");
            handleChange({ command: `--${sanitized}` });
          }}
        />
      </ResponsiveLayout>
    </Grid>
  );
};
