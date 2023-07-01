import { rawTheme, Box, theme } from "@webstudio-is/design-system";
import { colord, type RgbaColor } from "colord";
import { forwardRef, type ElementRef, type ComponentProps } from "react";

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

export const ColorThumb = forwardRef<
  ElementRef<typeof Box>,
  ComponentProps<typeof Box> & { color: RgbaColor }
>(({ color, ...rest }, ref) => {
  const colorString = colord(color).toRgbString();
  // @todo transparent icon can be better
  const background =
    color.a < 1
      ? // chessboard 5x5
        `repeating-conic-gradient(rgba(0,0,0,0.22) 0% 25%, transparent 0% 50%) 0% 33.33% / 40% 40%, ${colorString}`
      : colorString;

  const distanceToStartDrawBorder = 0.15;

  // White color is invisible on white background, so we need to draw border
  // the more color is white the more border is visible
  const borderColor = colord(
    lerpColor(
      transparent,
      borderColorSwatch,
      clamp(
        (distanceToStartDrawBorder - distance(whiteColor, color)) /
          distanceToStartDrawBorder,
        0,
        1
      )
    )
  ).toRgbString();

  return (
    <Box
      ref={ref}
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
      {...rest}
    />
  );
});
