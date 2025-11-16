import { css, rawTheme, theme, type CSS } from "../stitches.config";
import { colord, type RgbaColor } from "colord";
import { forwardRef, type ComponentProps, type ElementRef } from "react";

const clamp = (value: number, min: number, max: number) => {
  return Math.min(Math.max(value, min), max);
};

const whiteColor: RgbaColor = { r: 255, g: 255, b: 255, a: 1 };
const borderColorSwatch = colord(rawTheme.colors.borderColorSwatch).toRgb();
const transparentColor: RgbaColor = { r: 0, g: 0, b: 0, a: 0 };

const toRgbaColor = (color?: RgbaColor | string): RgbaColor => {
  if (color === undefined) {
    return transparentColor;
  }

  if (typeof color === "string") {
    const parsed = colord(color);
    if (parsed.isValid()) {
      return parsed.toRgb();
    }
    return transparentColor;
  }

  return color;
};

const distance = (a: RgbaColor, b: RgbaColor) => {
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

const calcBorderColor = (color: RgbaColor) => {
  const distanceToStartDrawBorder = 0.15;
  const alpha = clamp(
    (distanceToStartDrawBorder - distance(whiteColor, color)) /
      distanceToStartDrawBorder,
    0,
    1
  );
  return colord(lerpColor(transparentColor, borderColorSwatch, alpha));
};

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

type Props = Omit<ComponentProps<"button" | "span">, "color"> & {
  interactive?: boolean;
  color?: RgbaColor | string;
  css?: CSS;
};

export const ColorThumb = forwardRef<ElementRef<"button">, Props>(
  ({ interactive, color, css, ...rest }, ref) => {
    const resolvedColor = toRgbaColor(color);
    const isTransparent = resolvedColor.a < 1;
    const background = isTransparent
      ? `repeating-conic-gradient(rgba(0,0,0,0.22) 0% 25%, transparent 0% 50%) 0% 33.33% / 40% 40%, ${colord(resolvedColor).toRgbString()}`
      : colord(resolvedColor).toRgbString();
    const borderColor = calcBorderColor(resolvedColor);
    const Component = interactive ? "button" : "span";

    return (
      <Component
        {...rest}
        ref={ref}
        style={{
          background,
          borderColor: borderColor.toRgbString(),
          borderWidth: borderColor.alpha() === 0 ? 0 : 1,
        }}
        className={thumbStyle({ css })}
      />
    );
  }
);
ColorThumb.displayName = "ColorThumb";
