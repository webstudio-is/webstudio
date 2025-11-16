import {
  Popover,
  PopoverClose,
  PopoverContent,
  PopoverTrigger,
} from "./popover";
import { ColorThumb } from "./color-thumb";
import { Flex } from "./flex";
import { css, theme } from "../stitches.config";
import { type ComponentProps } from "react";

export const defaultSimpleColorPickerColors = [
  "#D73A4A", // Red
  "#F28B3E", // Orange
  "#FBCA04", // Yellow
  "#28A745", // Green
  "#2088FF", // Teal
  "#0366D6", // Blue
  "#0052CC", // Indigo
  "#8A63D2", // Purple
  "#E99695", // Light Pink
  "#F9D0C4", // Pink-ish Peach
  "#F9E79F", // Pale Yellow
  "#CCEBC5", // Light Green
  "#D1E7DD", // Light Cyan
  "#BFD7FF", // Light Blue
  "#C7D2FE", // Azure Light
  "#D8B4FE", // Lavender
] as const;

type SimpleColorPickerProps = {
  value?: string;
  onChange?: (value: string) => void;
  colors?: readonly string[];
  triggerProps?: ComponentProps<typeof ColorThumb>;
  "aria-label"?: string;
};

const swatchGridStyle = css({
  display: "grid",
  gridTemplateColumns: "repeat(8, minmax(0, 1fr))",
  columnGap: theme.spacing[2],
  rowGap: theme.spacing[4],
  justifyItems: "center",
});

export const SimpleColorPicker = ({
  value,
  onChange,
  colors = defaultSimpleColorPickerColors,
  triggerProps,
  "aria-label": ariaLabel = "Choose color",
}: SimpleColorPickerProps) => {
  const normalizedValue = value?.toLowerCase();
  const swatchesClass = swatchGridStyle();
  return (
    <Popover>
      <PopoverTrigger asChild>
        <ColorThumb
          interactive
          aria-label={ariaLabel}
          color={value}
          css={{
            width: theme.spacing[8],
            height: theme.spacing[8],
          }}
          {...triggerProps}
        />
      </PopoverTrigger>
      <PopoverContent sideOffset={4}>
        <Flex
          css={{
            padding: theme.spacing[3],
            gap: theme.spacing[3],
            width: theme.spacing[27],
          }}
          direction="column"
        >
          <div className={swatchesClass}>
            {colors.slice(0, 16).map((preset) => {
              const normalizedPreset = preset.toLowerCase();
              const isActive = normalizedPreset === normalizedValue;
              return (
                <PopoverClose asChild key={preset}>
                  <ColorThumb
                    interactive
                    aria-label={`Set color to ${preset}`}
                    color={preset}
                    onClick={() => {
                      onChange?.(preset);
                    }}
                    css={{
                      width: theme.spacing[7],
                      height: theme.spacing[7],
                      borderColor: isActive
                        ? theme.colors.borderFocus
                        : undefined,
                      boxShadow: isActive
                        ? `0 0 0 1px ${theme.colors.borderFocus}`
                        : undefined,
                    }}
                  />
                </PopoverClose>
              );
            })}
          </div>
        </Flex>
      </PopoverContent>
    </Popover>
  );
};
