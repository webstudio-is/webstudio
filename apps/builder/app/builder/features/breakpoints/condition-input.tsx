import { useMemo } from "react";
import { Combobox } from "@webstudio-is/design-system";

const PREDEFINED_CONDITIONS = [
  {
    value: "orientation:portrait",
    label: "Orientation: Portrait",
    description: "Device is in portrait mode (height > width)",
  },
  {
    value: "orientation:landscape",
    label: "Orientation: Landscape",
    description: "Device is in landscape mode (width > height)",
  },
  {
    value: "hover:hover",
    label: "Hover: Hover",
    description: "Primary input can hover over elements",
  },
  {
    value: "hover:none",
    label: "Hover: None",
    description: "Primary input cannot hover (e.g., touch screens)",
  },
  {
    value: "prefers-color-scheme:dark",
    label: "Color Scheme: Dark",
    description: "User prefers dark color scheme",
  },
  {
    value: "prefers-color-scheme:light",
    label: "Color Scheme: Light",
    description: "User prefers light color scheme",
  },
  {
    value: "prefers-reduced-motion:reduce",
    label: "Reduced Motion: Reduce",
    description: "User prefers reduced motion/animations",
  },
  {
    value: "prefers-reduced-motion:no-preference",
    label: "Reduced Motion: No Preference",
    description: "User has no preference for reduced motion",
  },
  {
    value: "pointer:coarse",
    label: "Pointer: Coarse",
    description: "Primary input has limited accuracy (e.g., touch)",
  },
  {
    value: "pointer:fine",
    label: "Pointer: Fine",
    description: "Primary input has fine accuracy (e.g., mouse)",
  },
  {
    value: "pointer:none",
    label: "Pointer: None",
    description: "No pointing device available",
  },
  {
    value: "any-hover:hover",
    label: "Any Hover: Hover",
    description: "At least one input can hover",
  },
  {
    value: "any-hover:none",
    label: "Any Hover: None",
    description: "No inputs can hover",
  },
  {
    value: "any-pointer:coarse",
    label: "Any Pointer: Coarse",
    description: "At least one input has limited accuracy",
  },
  {
    value: "any-pointer:fine",
    label: "Any Pointer: Fine",
    description: "At least one input has fine accuracy",
  },
  {
    value: "any-pointer:none",
    label: "Any Pointer: None",
    description: "No pointing devices available",
  },
  {
    value: "prefers-contrast:more",
    label: "Contrast: More",
    description: "User prefers higher contrast",
  },
  {
    value: "prefers-contrast:less",
    label: "Contrast: Less",
    description: "User prefers lower contrast",
  },
  {
    value: "prefers-contrast:no-preference",
    label: "Contrast: No Preference",
    description: "User has no contrast preference",
  },
  {
    value: "display-mode:fullscreen",
    label: "Display Mode: Fullscreen",
    description: "App is in fullscreen mode",
  },
  {
    value: "display-mode:standalone",
    label: "Display Mode: Standalone",
    description: "App is in standalone mode (PWA)",
  },
  {
    value: "display-mode:minimal-ui",
    label: "Display Mode: Minimal UI",
    description: "App with minimal browser UI (PWA)",
  },
  {
    value: "display-mode:browser",
    label: "Display Mode: Browser",
    description: "App in regular browser tab",
  },
];

type Condition = { value: string; label: string; description?: string };

type ConditionInputProps = {
  name?: string;
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  placeholder?: string;
};

export const ConditionInput = ({
  name,
  value,
  onChange,
  onBlur,
  placeholder = "e.g., orientation:portrait",
}: ConditionInputProps) => {
  // Find the matching condition item or create a custom one
  const selectedItem: Condition | null = useMemo(() => {
    const found = PREDEFINED_CONDITIONS.find((c) => c.value === value);
    if (found) {
      return found;
    }
    // If value doesn't match any predefined condition, create a custom item
    if (value) {
      return { value, label: value };
    }
    return null;
  }, [value]);

  return (
    <Combobox<Condition>
      value={selectedItem}
      itemToString={(item) => item?.value ?? ""}
      getItems={() => PREDEFINED_CONDITIONS}
      match={(search, items, itemToString) => {
        if (!search) {
          return items;
        }
        const searchLower = search.toLowerCase();
        return items.filter(
          (item) =>
            item.label.toLowerCase().includes(searchLower) ||
            itemToString(item).toLowerCase().includes(searchLower)
        );
      }}
      getItemProps={(item) => ({
        children: item.label,
      })}
      getDescription={(item) => item?.description}
      onItemSelect={(item) => {
        if (item) {
          onChange(item.value);
        }
      }}
      onChange={(value) => {
        onChange(value ?? "");
      }}
      name={name}
      onBlur={onBlur}
      placeholder={placeholder}
    />
  );
};
