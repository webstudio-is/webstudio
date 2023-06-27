import { useEffect, useState } from "react";
import { colord, extend, type RgbaColor } from "colord";
import namesPlugin from "colord/plugins/names";
import { type ColorResult, type RGBColor, SketchPicker } from "react-color";
import type {
  InvalidValue,
  KeywordValue,
  RgbValue,
  StyleProperty,
  StyleValue,
} from "@webstudio-is/css-data";
import {
  Box,
  Popover,
  PopoverTrigger,
  PopoverContent,
  css,
  rawTheme,
} from "@webstudio-is/design-system";
import { toValue } from "@webstudio-is/css-engine";
import { theme } from "@webstudio-is/design-system";
import type { StyleSource } from "./style-info";
import { CssValueInput } from "./css-value-input";
import type { IntermediateStyleValue } from "./css-value-input/css-value-input";
import { isCanvasPointerEventsEnabledStore } from "~/builder/shared/nano-states";
import { useStore } from "@nanostores/react";

// To support color names
extend([namesPlugin]);

const pickerStyle = css({
  padding: theme.spacing[5],
  background: theme.colors.panel,
  // @todo this lib doesn't have another way to define styles for inputs
  // we should either submit a PR or replace it
  "& input": {
    color: theme.colors.hiContrast,
    background: theme.colors.loContrast,
  },
});

const defaultPickerStyles = {
  default: {
    // Workaround to allow overrides using className
    picker: { padding: "", background: "" },
  },
};

const colorResultToRgbValue = (rgb: RgbaColor | RGBColor): RgbValue => {
  return {
    type: "rgb",
    r: rgb.r,
    g: rgb.g,
    b: rgb.b,
    alpha: rgb.a ?? 1,
  };
};

const styleValueResolve = (
  value: RgbValue | KeywordValue,
  currentColor: RgbValue
): RgbValue | KeywordValue => {
  if (
    value.type === "keyword" &&
    value.value.toLowerCase() === "currentcolor"
  ) {
    return {
      type: "rgb",
      r: currentColor.r,
      g: currentColor.g,
      b: currentColor.b,
      alpha: currentColor.alpha,
    };
  }

  return value;
};

const styleValueToRgbaColor = (value: CssColorPickerValueInput): RgbaColor => {
  const color = colord(
    value.type === "intermediate" ? value.value : toValue(value)
  ).toRgb();

  return {
    r: color.r,
    g: color.g,
    b: color.b,
    a: color.a,
  };
};

const whiteColor = { r: 255, g: 255, b: 255, a: 1 };
const borderColorSwatch = colord(rawTheme.colors.borderColorSwatch).toRgb();
const transparent = colord("transparent").toRgb();

const distance = (a: RgbaColor, b: RgbaColor) => {
  // Use Euclidian distance, if will not give good results use https://zschuessler.github.io/DeltaE/
  return Math.sqrt(
    Math.pow(a.r / 255 - b.r / 255, 2) +
      Math.pow(a.g / 255 - b.g / 255, 2) +
      Math.pow(a.b / 255 - b.b / 255, 2) +
      Math.pow(a.a - b.a, 2)
  );
};

const lerp = (a: number, b: number, t: number) => {
  return a * (1 - t) + b * t;
};

const lerpColor = (a: RgbaColor, b: RgbaColor, t: number) => {
  return {
    r: lerp(a.r, b.r, t),
    g: lerp(a.g, b.g, t),
    b: lerp(a.b, b.b, t),
    a: lerp(a.a, b.a, t),
  };
};

const clamp = (value: number, min: number, max: number) => {
  return Math.min(Math.max(value, min), max);
};

// Dragging over canvas iframe with CORS policies will lead to loosing events and getting stuck in mousedown state.
const useFixDragOverCanvas = () => {
  const isCanvasPointerEventsEnabled = useStore(
    isCanvasPointerEventsEnabledStore
  );

  useEffect(() => {
    const handleMouseUp = () => {
      isCanvasPointerEventsEnabledStore.set(true);
      removeEventListener("mouseup", handleMouseUp);
    };
    if (isCanvasPointerEventsEnabled === false) {
      addEventListener("mouseup", handleMouseUp);
    }
    return () => {
      removeEventListener("mouseup", handleMouseUp);
    };
  }, [isCanvasPointerEventsEnabled]);

  const handleChange = (event: MouseEvent) => {
    // Prevents selection of text during drag.
    if (event.type === "mousedown") {
      event.preventDefault();
      isCanvasPointerEventsEnabledStore.set(false);
    }
  };
  return { handleChange };
};

export type CssColorPickerValueInput =
  | RgbValue
  | KeywordValue
  | IntermediateStyleValue
  | InvalidValue;

type ColorPickerProps = {
  onChange: (value: CssColorPickerValueInput | undefined) => void;
  onChangeComplete: (event: {
    value: RgbValue | KeywordValue | InvalidValue;
  }) => void;
  onHighlight: (value: StyleValue | undefined) => void;
  onAbort: () => void;
  intermediateValue: CssColorPickerValueInput | undefined;
  value: RgbValue | KeywordValue;
  currentColor: RgbValue;
  styleSource: StyleSource;
  keywords?: Array<KeywordValue>;
  property: StyleProperty;
};

export const ColorPicker = ({
  value,
  currentColor,
  intermediateValue,
  onChange,
  onChangeComplete,
  onHighlight,
  onAbort,
  styleSource,
  keywords,
  property,
}: ColorPickerProps) => {
  const [displayColorPicker, setDisplayColorPicker] = useState(false);
  const canvasFix = useFixDragOverCanvas();

  const currentValue =
    intermediateValue ?? styleValueResolve(value, currentColor);

  const rgbValue = styleValueToRgbaColor(currentValue);

  // Change prefix color in sync with color picker, don't change during input changed
  let prefixColor = styleValueResolve(
    currentValue.type === "keyword" || currentValue.type === "rgb"
      ? currentValue
      : value,
    currentColor
  );
  // consider inherit on color same as currentColor
  if (
    property === "color" &&
    prefixColor.type === "keyword" &&
    prefixColor.value === "inherit"
  ) {
    prefixColor = {
      type: "rgb",
      r: currentColor.r,
      g: currentColor.g,
      b: currentColor.b,
      alpha: currentColor.alpha,
    };
  }

  const prefixColorRgba = styleValueToRgbaColor(prefixColor);

  // @todo transparent icon can be better
  const background =
    prefixColorRgba.a < 1
      ? // chessboard 5x5
        `repeating-conic-gradient(rgba(0,0,0,0.22) 0% 25%, transparent 0% 50%) 0% 33.33% / 40% 40%, ${toValue(
          prefixColor
        )}`
      : toValue(prefixColor);

  const distanceToStartDrawBorder = 0.15;

  // White color is invisible on white background, so we need to draw border
  // the more color is white the more border is visible
  const borderColor = colord(
    lerpColor(
      transparent,
      borderColorSwatch,
      clamp(
        (distanceToStartDrawBorder - distance(whiteColor, prefixColorRgba)) /
          distanceToStartDrawBorder,
        0,
        1
      )
    )
  ).toRgbString();

  /**
   * By default, the color can be transparent, but if the user chooses a color from the picker,
   * we must set alpha = 1 otherwise all selected colors will be transparent.
   */
  const fixColor = (color: ColorResult) => {
    const newColor = { ...color.rgb };

    if (
      currentValue.type === "keyword" &&
      currentValue.value === "transparent"
    ) {
      newColor.a = 1;
    }
    return colorResultToRgbValue(newColor);
  };

  const prefix = (
    <Popover
      modal
      open={displayColorPicker}
      onOpenChange={setDisplayColorPicker}
    >
      <PopoverTrigger
        asChild
        aria-label="Open color picker"
        onClick={() => setDisplayColorPicker((shown) => !shown)}
      >
        <Box
          css={{
            margin: theme.spacing[3],
            width: theme.spacing[10],
            height: theme.spacing[10],
            backgroundBlendMode: "difference",
            borderRadius: 2,
            background,
            borderColor,
            borderStyle: "solid",
          }}
        />
      </PopoverTrigger>

      <PopoverContent>
        <SketchPicker
          color={rgbValue}
          onChange={(color: ColorResult, event) => {
            // SketchPicker event can be mouse event, type is wrong.
            canvasFix.handleChange(event as unknown as MouseEvent);
            const newColor = fixColor(color);
            onChange(newColor);
          }}
          onChangeComplete={(color: ColorResult) => {
            const newColor = fixColor(color);
            onChangeComplete({
              value: newColor,
            });
          }}
          // @todo to remove both when we have preset colors
          presetColors={[]}
          className={pickerStyle()}
          styles={defaultPickerStyles}
        />
      </PopoverContent>
    </Popover>
  );

  return (
    <CssValueInput
      styleSource={styleSource}
      prefix={prefix}
      showSuffix={false}
      property={property}
      value={value}
      intermediateValue={intermediateValue}
      keywords={keywords}
      onChange={(styleValue) => {
        if (
          styleValue?.type === "rgb" ||
          styleValue?.type === "keyword" ||
          styleValue?.type === "intermediate" ||
          styleValue?.type === "invalid" ||
          styleValue === undefined
        ) {
          onChange(styleValue);
          return;
        }

        onChange({
          type: "intermediate",
          value: toValue(styleValue),
        });
      }}
      onHighlight={onHighlight}
      onChangeComplete={({ value }) => {
        if (value.type === "rgb" || value.type === "keyword") {
          onChangeComplete({ value });
          return;
        }
        // In case value is parsed to something wrong
        onChange({
          type: "invalid",
          value: toValue(value),
        });
      }}
      onAbort={onAbort}
    />
  );
};
