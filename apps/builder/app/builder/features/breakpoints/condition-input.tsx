import { useMemo } from "react";
import { Combobox } from "@webstudio-is/design-system";

const PREDEFINED_CONDITIONS = [
  { value: "orientation:portrait", label: "Orientation: Portrait" },
  { value: "orientation:landscape", label: "Orientation: Landscape" },
  { value: "hover:hover", label: "Hover: Hover" },
  { value: "hover:none", label: "Hover: None" },
  { value: "prefers-color-scheme:dark", label: "Color Scheme: Dark" },
  { value: "prefers-color-scheme:light", label: "Color Scheme: Light" },
  { value: "prefers-reduced-motion:reduce", label: "Reduced Motion: Reduce" },
  {
    value: "prefers-reduced-motion:no-preference",
    label: "Reduced Motion: No Preference",
  },
  { value: "pointer:coarse", label: "Pointer: Coarse" },
  { value: "pointer:fine", label: "Pointer: Fine" },
  { value: "pointer:none", label: "Pointer: None" },
  { value: "any-hover:hover", label: "Any Hover: Hover" },
  { value: "any-hover:none", label: "Any Hover: None" },
  { value: "any-pointer:coarse", label: "Any Pointer: Coarse" },
  { value: "any-pointer:fine", label: "Any Pointer: Fine" },
  { value: "any-pointer:none", label: "Any Pointer: None" },
  { value: "prefers-contrast:more", label: "Contrast: More" },
  { value: "prefers-contrast:less", label: "Contrast: Less" },
  { value: "prefers-contrast:no-preference", label: "Contrast: No Preference" },
  { value: "display-mode:fullscreen", label: "Display Mode: Fullscreen" },
  { value: "display-mode:standalone", label: "Display Mode: Standalone" },
  { value: "display-mode:minimal-ui", label: "Display Mode: Minimal UI" },
  { value: "display-mode:browser", label: "Display Mode: Browser" },
];

type Condition = { value: string; label: string };

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
