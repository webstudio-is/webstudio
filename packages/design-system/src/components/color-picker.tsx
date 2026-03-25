import * as colorjs from "colorjs.io/fn";
import "hdr-color-input";
import type { ChangeDetail, ColorInput } from "hdr-color-input";
import React, {
  forwardRef,
  type ComponentProps,
  type ElementRef,
  useEffect,
  useRef,
} from "react";
import { clamp } from "@react-aria/utils";
import { useDebouncedCallback } from "use-debounce";
import {
  toValue,
  type StyleValue,
  type Unit,
  type ColorValue,
  type UnparsedValue,
} from "@webstudio-is/css-engine";
import { css, rawTheme, theme, type CSS } from "../stitches.config";
import { useDisableCanvasPointerEvents } from "../utilities";

// ─── colorjs color space registrations ──────────────────────────────────────

colorjs.ColorSpace.register(colorjs.sRGB);
colorjs.ColorSpace.register(colorjs.sRGB_Linear);
colorjs.ColorSpace.register(colorjs.HSL);
colorjs.ColorSpace.register(colorjs.HWB);
colorjs.ColorSpace.register(colorjs.Lab);
colorjs.ColorSpace.register(colorjs.LCH);
colorjs.ColorSpace.register(colorjs.OKLab);
colorjs.ColorSpace.register(colorjs.OKLCH);
colorjs.ColorSpace.register(colorjs.P3);
colorjs.ColorSpace.register(colorjs.A98RGB);
colorjs.ColorSpace.register(colorjs.ProPhoto);
colorjs.ColorSpace.register(colorjs.REC_2020);
colorjs.ColorSpace.register(colorjs.XYZ_D65);
colorjs.ColorSpace.register(colorjs.XYZ_D50);

// ─── JSX type for <color-input> custom element ──────────────────────────────

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace React.JSX {
    interface IntrinsicElements {
      "color-input": React.HTMLAttributes<HTMLElement> & {
        ref?: React.Ref<HTMLElement>;
        value?: string;
        colorspace?: string;
        theme?: "auto" | "light" | "dark";
        "no-alpha"?: boolean | string;
      };
    }
  }
}

// ─── Color utilities ─────────────────────────────────────────────────────────

type RgbaColor = {
  r: number;
  g: number;
  b: number;
  a: number;
};

// Helper to create RgbaColor from colorjs.io Color
const colorToRgba = (color: colorjs.PlainColorObject): RgbaColor => {
  const [r, g, b] = color.coords;
  return {
    r: (r ?? 0) * 255,
    g: (g ?? 0) * 255,
    b: (b ?? 0) * 255,
    a: color.alpha ?? 1,
  };
};

const transparentColor: RgbaColor = { r: 0, g: 0, b: 0, a: 0 };

// Resolve a color string the browser understands but colorjs doesn't
// (e.g. color-mix(), relative color syntax). Returns undefined in non-browser
// environments (SSR, tests) or when the browser can't resolve the color.
const resolveColorViaCanvas = (colorString: string): RgbaColor | undefined => {
  if (typeof document === "undefined") {
    return;
  }
  const canvas = document.createElement("canvas");
  canvas.width = 1;
  canvas.height = 1;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    return;
  }
  ctx.fillStyle = colorString;
  ctx.fillRect(0, 0, 1, 1);
  const [r, g, b, a] = ctx.getImageData(0, 0, 1, 1).data;
  return { r: r ?? 0, g: g ?? 0, b: b ?? 0, a: (a ?? 255) / 255 };
};

// Helper to parse color string to RgbaColor
export const parseColorString = (colorString: string): RgbaColor => {
  try {
    return colorToRgba(colorjs.to(colorString, "srgb"));
  } catch {
    return resolveColorViaCanvas(colorString) ?? transparentColor;
  }
};

// Helper to convert RgbaColor to RGB string (used for border color)
const rgbaToRgbString = (color: RgbaColor): string => {
  const { r, g, b, a } = color;
  if (a < 1) {
    return `rgba(${Math.round(r)}, ${Math.round(g)}, ${Math.round(b)}, ${a})`;
  }
  return `rgb(${Math.round(r)}, ${Math.round(g)}, ${Math.round(b)})`;
};

// colorjs spaceId → ColorValue["colorSpace"] (same as parse-css-value.ts)
const colorSpaceMap: Record<string, ColorValue["colorSpace"]> = {
  srgb: "srgb",
  "srgb-linear": "srgb-linear",
  hsl: "hsl",
  hwb: "hwb",
  lab: "lab",
  lch: "lch",
  oklab: "oklab",
  oklch: "oklch",
  p3: "p3",
  a98rgb: "a98rgb",
  prophoto: "prophoto",
  rec2020: "rec2020",
  "xyz-d65": "xyz-d65",
  "xyz-d50": "xyz-d50",
  xyz: "xyz-d65",
};

const toColorComponent = (value: undefined | null | number) =>
  Math.round((value ?? 0) * 10000) / 10000;

// Convert a CSS color string emitted by <color-input> into a StyleValue.
// colorjs can parse all concrete color values the picker produces.
// Falls back to UnparsedValue for anything it can't parse (e.g. relative colors
// typed directly into the text field).
const cssStringToStyleValue = (
  cssString: string
): ColorValue | UnparsedValue => {
  try {
    const color = colorjs.parse(cssString);
    return {
      type: "color",
      colorSpace: colorSpaceMap[color.spaceId] ?? "srgb",
      components: color.coords.map(
        toColorComponent
      ) as ColorValue["components"],
      alpha: toColorComponent(color.alpha),
    };
  } catch {
    return { type: "unparsed", value: cssString };
  }
};

// ─── ColorThumb ──────────────────────────────────────────────────────────────

const whiteColor: RgbaColor = { r: 255, g: 255, b: 255, a: 1 };
const borderColorSwatch = colorToRgba(
  colorjs.to(rawTheme.colors.borderColorSwatch, "srgb")
);

const distance = (a: RgbaColor, b: RgbaColor) =>
  Math.sqrt(
    Math.pow(a.r / 255 - b.r / 255, 2) +
      Math.pow(a.g / 255 - b.g / 255, 2) +
      Math.pow(a.b / 255 - b.b / 255, 2) +
      Math.pow(a.a - b.a, 2)
  );

const calcBorderColor = (color: RgbaColor) => {
  const distanceToStartDrawBorder = 0.15;
  const alpha = clamp(
    (distanceToStartDrawBorder - distance(whiteColor, color)) /
      distanceToStartDrawBorder,
    0,
    1
  );
  return lerpColor(transparentColor, borderColorSwatch, alpha);
};

const lerp = (a: number, b: number, t: number) => a * (1 - t) + b * t;

const lerpColor = (a: RgbaColor, b: RgbaColor, t: number) => ({
  r: lerp(a.r, b.r, t),
  g: lerp(a.g, b.g, t),
  b: lerp(a.b, b.b, t),
  a: lerp(a.a, b.a, t),
});

const thumbStyle = css({
  display: "block",
  width: theme.spacing[9],
  height: theme.spacing[9],
  backgroundBlendMode: "difference",
  borderRadius: theme.borderRadius[2],
  borderWidth: 0,
  borderStyle: "solid",
  "&:focus-visible": {
    outline: `1px solid ${theme.colors.borderFocus}`,
    outlineOffset: 1,
  },
});

export type ColorThumbProps = Omit<
  ComponentProps<"button" | "span">,
  "color"
> & {
  interactive?: boolean;
  color?: string;
  css?: CSS;
};

export const ColorThumb = forwardRef<ElementRef<"button">, ColorThumbProps>(
  ({ interactive, color = "transparent", css, ...rest }, ref) => {
    const rgba = parseColorString(color);
    const background =
      rgba.a < 1
        ? `repeating-conic-gradient(rgba(0,0,0,0.22) 0% 25%, transparent 0% 50%)
 0% 33.33% / 40% 40%, ${color}`
        : color;
    const borderColor = calcBorderColor(rgba);

    const Component = interactive ? "button" : "span";

    return (
      <Component
        style={{
          background,
          borderColor: rgbaToRgbString(borderColor),
          borderWidth: borderColor.a === 0 ? 0 : 1,
        }}
        className={thumbStyle({ css })}
        tabIndex={-1}
        {...rest}
        ref={ref}
      />
    );
  }
);

ColorThumb.displayName = "ColorThumb";

// ─── ColorPicker / ColorPickerPopover ────────────────────────────────────────

type IntermediateColorValue = {
  type: "intermediate";
  value: string;
  unit?: Unit;
};

type ColorPickerValue = StyleValue | IntermediateColorValue;

type ColorPickerProps = {
  value: ColorPickerValue;
  onChange: (value: StyleValue | undefined) => void;
  onChangeComplete: (value: StyleValue) => void;
};

type ColorPickerPopoverProps = {
  value: StyleValue;
  onChange: (value: StyleValue | undefined) => void;
  onChangeComplete: (value: StyleValue) => void;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  thumb?: React.ReactElement;
  side?: "top" | "right" | "bottom" | "left";
  align?: "start" | "center" | "end";
  // Kept for API compatibility; positioning is managed by the web component.
  sideOffset?: number;
};

// Standalone color picker — renders <color-input> with its panel immediately
// open so it can be embedded inside a custom container without triggering
// the web component's own popover mechanism.
export const ColorPicker = ({
  value,
  onChange,
  onChangeComplete,
}: ColorPickerProps) => {
  const pickerRef = useRef<HTMLElement>(null);
  const colorString =
    value.type === "intermediate" ? value.value : toValue(value);

  const handleCompleteDebounced = useDebouncedCallback(
    (v: StyleValue) => onChangeComplete(v),
    500
  );

  // Sync external value changes into the web component.
  useEffect(() => {
    const el = pickerRef.current as ColorInput | null;
    if (el && el.value !== colorString) {
      el.value = colorString;
    }
  }, [colorString]);

  // Wire up the change event.
  useEffect(() => {
    const el = pickerRef.current;
    if (!el) return;
    const handler = (e: Event) => {
      const { value: css } = (e as CustomEvent<ChangeDetail>).detail;
      const styleValue = cssStringToStyleValue(css);
      onChange(styleValue);
      handleCompleteDebounced(styleValue);
    };
    el.addEventListener("change", handler);
    return () => el.removeEventListener("change", handler);
  }, [onChange, handleCompleteDebounced]);

  // Open the picker panel immediately (we're being rendered inline, not via
  // the web component's own trigger button).
  useEffect(() => {
    (pickerRef.current as ColorInput | null)?.showPicker();
  }, []);

  return <color-input ref={pickerRef} value={colorString} theme="dark" />;
};

// Popover wrapper — renders <color-input> with its built-in trigger chip,
// hiding only the text input. The chip opens the panel natively via the
// Popover API. Value sync and open/close events are wired up in effects.
export const ColorPickerPopover = ({
  value,
  onChange,
  onChangeComplete,
  open,
  onOpenChange,
}: ColorPickerPopoverProps) => {
  const pickerRef = useRef<HTMLElement>(null);
  const { enableCanvasPointerEvents, disableCanvasPointerEvents } =
    useDisableCanvasPointerEvents();

  const colorString = toValue(value);

  const handleCompleteDebounced = useDebouncedCallback(
    (v: StyleValue) => onChangeComplete(v),
    500
  );

  // Sync externally-controlled open state into the web component.
  useEffect(() => {
    const el = pickerRef.current as ColorInput | null;
    if (open === true) el?.show();
    if (open === false) el?.close();
  }, [open]);

  // Sync external value changes into the web component.
  useEffect(() => {
    const el = pickerRef.current as ColorInput | null;
    if (el && el.value !== colorString) {
      el.value = colorString;
    }
  }, [colorString]);

  // Wire up change / open / close events.
  useEffect(() => {
    const el = pickerRef.current;
    if (!el) return;

    const handleChange = (e: Event) => {
      const { value: css } = (e as CustomEvent<ChangeDetail>).detail;
      const styleValue = cssStringToStyleValue(css);
      onChange(styleValue);
      handleCompleteDebounced(styleValue);
    };

    const handleOpen = () => {
      disableCanvasPointerEvents();
      document.body.style.userSelect = "none";
      onOpenChange?.(true);
    };

    const handleClose = () => {
      enableCanvasPointerEvents();
      document.body.style.removeProperty("user-select");
      onOpenChange?.(false);
    };

    el.addEventListener("change", handleChange);
    el.addEventListener("open", handleOpen);
    el.addEventListener("close", handleClose);

    return () => {
      el.removeEventListener("change", handleChange);
      el.removeEventListener("open", handleOpen);
      el.removeEventListener("close", handleClose);
      enableCanvasPointerEvents();
      document.body.style.removeProperty("user-select");
    };
  }, [
    onChange,
    handleCompleteDebounced,
    onOpenChange,
    disableCanvasPointerEvents,
    enableCanvasPointerEvents,
  ]);

  return (
    <>
      <style>{`
        color-input::part(input) {
          display: none;
        }
        color-input::part(chip) {
          width: ${rawTheme.spacing[9]};
          height: ${rawTheme.spacing[9]};
          border-radius: ${rawTheme.borderRadius[2]};
          background-blend-mode: difference;
        }
      `}</style>
      <color-input ref={pickerRef} value={colorString} theme="light" />
    </>
  );
};
