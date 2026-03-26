import * as colorjs from "colorjs.io/fn";
import "hdr-color-input";
import type { ChangeDetail, ColorInput, ColorSpace } from "hdr-color-input";
// @ts-ignore React is used in the global JSX type declaration below
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import React from "react";
import {
  forwardRef,
  type ComponentProps,
  type ElementRef,
  useEffect,
  useId,
  useRef,
} from "react";
import { clamp } from "@react-aria/utils";
import {
  toValue,
  type StyleValue,
  type ColorValue,
} from "@webstudio-is/css-engine";
import { css, rawTheme, theme, type CSS } from "../stitches.config";
import { useDisableCanvasPointerEvents } from "../utilities";
import { textStyle } from "./text";

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
        class?: string;
      };
    }
  }
}

// ─── Color utilities ─────────────────────────────────────────────────────────

type RgbaColor = {
  red: number;
  green: number;
  blue: number;
  alpha: number;
};

// Helper to create RgbaColor from colorjs.io Color
const colorToRgba = (color: colorjs.PlainColorObject): RgbaColor => {
  const [red, green, blue] = color.coords;
  return {
    red: (red ?? 0) * 255,
    green: (green ?? 0) * 255,
    blue: (blue ?? 0) * 255,
    alpha: color.alpha ?? 1,
  };
};

const transparentColor: RgbaColor = { red: 0, green: 0, blue: 0, alpha: 0 };

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
  const [red, green, blue, alpha] = ctx.getImageData(0, 0, 1, 1).data;
  return {
    red: red ?? 0,
    green: green ?? 0,
    blue: blue ?? 0,
    alpha: (alpha ?? 255) / 255,
  };
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
  const { red, green, blue, alpha } = color;
  if (alpha < 1) {
    return `rgba(${Math.round(red)}, ${Math.round(green)}, ${Math.round(blue)}, ${alpha})`;
  }
  return `rgb(${Math.round(red)}, ${Math.round(green)}, ${Math.round(blue)})`;
};

const toColorComponent = (value: undefined | null | number) =>
  Math.round((value ?? 0) * 10000) / 10000;

// Convert a CSS color string emitted by <color-input> into a StyleValue.
export const cssStringToStyleValue = (
  cssString: string,
  colorspace: ColorSpace
): ColorValue => {
  // Most ColorSpace values match ColorValue["colorSpace"] directly;
  // only a handful of wide-gamut names differ.
  const colorSpaceMap: Partial<Record<ColorSpace, ColorValue["colorSpace"]>> = {
    "display-p3": "p3",
    "a98-rgb": "a98rgb",
    xyz: "xyz-d65",
  };
  const colorSpace = (colorSpaceMap[colorspace] ??
    colorspace) as ColorValue["colorSpace"];
  // For hex, colorjs parses to sRGB coords under the "srgb" spaceId — we keep
  // those coords but override the colorSpace to "hex" so toValue() serializes
  // back to hex format. For other spaces, use coords as-is.
  const parsed = colorjs.parse(cssString);
  const color = colorSpace === "hex" ? colorjs.to(parsed, "srgb") : parsed;
  return {
    type: "color",
    colorSpace,
    components: color.coords.map(toColorComponent) as ColorValue["components"],
    alpha: toColorComponent(color.alpha),
  };
};

// ─── ColorThumb ──────────────────────────────────────────────────────────────

const whiteColor: RgbaColor = { red: 255, green: 255, blue: 255, alpha: 1 };
const borderColorSwatch = colorToRgba(
  colorjs.to(rawTheme.colors.borderColorSwatch, "srgb")
);

const distance = (colorA: RgbaColor, colorB: RgbaColor) =>
  Math.sqrt(
    Math.pow(colorA.red / 255 - colorB.red / 255, 2) +
      Math.pow(colorA.green / 255 - colorB.green / 255, 2) +
      Math.pow(colorA.blue / 255 - colorB.blue / 255, 2) +
      Math.pow(colorA.alpha - colorB.alpha, 2)
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

const lerp = (start: number, end: number, ratio: number) =>
  start * (1 - ratio) + end * ratio;

const lerpColor = (colorA: RgbaColor, colorB: RgbaColor, ratio: number) => ({
  red: lerp(colorA.red, colorB.red, ratio),
  green: lerp(colorA.green, colorB.green, ratio),
  blue: lerp(colorA.blue, colorB.blue, ratio),
  alpha: lerp(colorA.alpha, colorB.alpha, ratio),
});

const thumbStyle = css({
  display: "block",
  position: "relative",
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
      rgba.alpha < 1
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
          borderWidth: borderColor.alpha === 0 ? 0 : 1,
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

type ColorPickerProps = {
  value: StyleValue;
  onChange: (value: StyleValue | undefined) => void;
  onChangeComplete: (value: StyleValue) => void;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  css?: CSS;
};

// Renders <color-input> with its built-in trigger chip, hiding the text input.
// The chip opens the panel natively via the Popover API.
// Our own ColorThumb is rendered on top (pointer-events: none) so that clicks
// pass through to the real chip underneath.
export const ColorPicker = ({
  value,
  onChange,
  onChangeComplete,
  open,
  onOpenChange,
  css,
}: ColorPickerProps) => {
  const pickerRef = useRef<ColorInput>(null);
  const scopeClass = useId().replace(/:/g, "");
  const { enableCanvasPointerEvents, disableCanvasPointerEvents } =
    useDisableCanvasPointerEvents();

  // Keep stable refs to callbacks so the event-wiring effect never needs to
  // re-run (and tear down / re-attach listeners) just because a prop changed.
  const callbacksRef = useRef({
    onChange,
    onChangeComplete,
    onOpenChange,
    disableCanvasPointerEvents,
    enableCanvasPointerEvents,
    value,
  });
  callbacksRef.current = {
    onChange,
    onChangeComplete,
    onOpenChange,
    disableCanvasPointerEvents,
    enableCanvasPointerEvents,
    value,
  };

  const colorString = toValue(value);

  // Sync externally-controlled open state into the web component.
  useEffect(() => {
    if (open === undefined) {
      return;
    }
    // hdr-color-input is loaded lazily; wait for the element to be defined
    // before calling .show()/.close() so the methods are available.
    customElements.whenDefined("color-input").then(() => {
      try {
        if (open === true) {
          pickerRef.current?.show();
        } else {
          pickerRef.current?.close();
        }
      } catch {}
    });
  }, [open]);

  // Sync external value changes into the web component.
  useEffect(() => {
    const el = pickerRef.current;
    if (el && el.value !== colorString) {
      el.value = colorString;
    }
  }, [colorString]);

  // Wire up change / open / close events.
  useEffect(() => {
    const el = pickerRef.current;
    if (!el) {
      return;
    }

    const controller = new AbortController();
    const { signal } = controller;
    let lastStyleValue: StyleValue = callbacksRef.current.value;

    el.addEventListener(
      "change",
      (event: Event) => {
        const { value: css, colorspace } = (event as CustomEvent<ChangeDetail>)
          .detail;
        lastStyleValue = cssStringToStyleValue(css, colorspace);
        callbacksRef.current.onChange(lastStyleValue);
      },
      { signal }
    );

    el.addEventListener(
      "open",
      () => {
        callbacksRef.current.disableCanvasPointerEvents();
        document.body.style.userSelect = "none";
        callbacksRef.current.onOpenChange?.(true);
      },
      { signal }
    );

    el.addEventListener(
      "close",
      () => {
        callbacksRef.current.enableCanvasPointerEvents();
        document.body.style.removeProperty("user-select");
        callbacksRef.current.onOpenChange?.(false);
        callbacksRef.current.onChangeComplete(lastStyleValue);
      },
      { signal }
    );

    return () => {
      controller.abort();
      callbacksRef.current.enableCanvasPointerEvents();
      document.body.style.removeProperty("user-select");
    };
  }, []);

  const { className: textClass } = textStyle();

  return (
    <>
      <style>{`
        /* Stitches can't handle ::part, need to migrate a new styling approach */
        .${scopeClass}, 
        .${scopeClass}::part(trigger), 
        .${scopeClass}::part(chip) {
          position: absolute;
          inset: 0;
          opacity: 0;
          width: auto;
          height: auto;
        }
        .${scopeClass}::part(input) {
          display: none;
        }
        .${scopeClass}::part(controls) {
          /* Hack to fix as we can't reach into .control and change grid-template-columns */
          font-size: 16px;
        }
        .${scopeClass} {
          /* color-scheme cascades into shadow DOM and forces native selects (appearance:
             base-select) to render with light-mode colors so text is visible in the
             ::picker(select) top-layer popup */
          color-scheme: light;
        }
      `}</style>

      <ColorThumb color={colorString} css={css}>
        <color-input
          ref={pickerRef}
          value={colorString}
          theme="light"
          class={`${textClass} ${scopeClass}`}
        />
      </ColorThumb>
    </>
  );
};
