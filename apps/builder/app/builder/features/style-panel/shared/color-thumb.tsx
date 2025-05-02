import { rawTheme, theme, css, type CSS } from "@webstudio-is/design-system";
import { colord, type RgbaColor } from "colord";
import { forwardRef, type ElementRef, type ComponentProps } from "react";
import { clamp } from "~/shared/math-utils";

const whiteColor: RgbaColor = { r: 255, g: 255, b: 255, a: 1 };
const borderColorSwatch = colord(rawTheme.colors.borderColorSwatch).toRgb();
const transparentColor: RgbaColor = { r: 0, g: 0, b: 0, a: 0 };

const distance = (a: RgbaColor, b: RgbaColor) => {
  // Use Euclidian distance
  // If results are not good, lets switch to https://zschuessler.github.io/DeltaE/
  return Math.sqrt(
    Math.pow(a.r / 255 - b.r / 255, 2) +
      Math.pow(a.g / 255 - b.g / 255, 2) +
      Math.pow(a.b / 255 - b.b / 255, 2) +
      Math.pow(a.a - b.a, 2)
  );
};

// White color is invisible on white background, so we need to draw border
// the more color is white the more border is visible
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
  color?: RgbaColor;
  css?: CSS;
};

export const ColorThumb = forwardRef<ElementRef<"button">, Props>(
  ({ interactive, color = transparentColor, css, ...rest }, ref) => {
    const background =
      color === undefined || color.a < 1
        ? // Chessboard pattern 5x5
          `repeating-conic-gradient(rgba(0,0,0,0.22) 0% 25%, transparent 0% 50%) 0% 33.33% / 40% 40%, ${colord(color).toRgbString()}`
        : colord(color).toRgbString();
    const borderColor = calcBorderColor(color);

    const Component = interactive ? "button" : "span";

    return (
      <Component
        {...rest}
        ref={ref}
        style={{
          background,
          borderColor: borderColor.toRgbString(),
          // Border becomes visible when color is close to white so that the thumb is visible in the white input.
          borderWidth: borderColor.alpha() === 0 ? 0 : 1,
        }}
        className={thumbStyle({ css })}
      />
    );
  }
);

ColorThumb.displayName = "ColorThumb";
