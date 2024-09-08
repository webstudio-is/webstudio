import { rawTheme, Box, theme, css } from "@webstudio-is/design-system";
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

const style = css({
  width: theme.spacing[10],
  height: theme.spacing[10],
  backgroundBlendMode: "difference",
  borderRadius: theme.borderRadius[2],
  // Border becomes visible when color is close to white so that the thumb is visible in the white input.
  borderWidth: theme.spacing[1],
  borderStyle: "solid",
});

export const ColorThumb = forwardRef<
  ElementRef<typeof Box>,
  Omit<ComponentProps<typeof Box>, "color"> & { color?: RgbaColor }
>(({ color = transparentColor, css, ...rest }, ref) => {
  // @todo transparentColor icon can be better
  const backgroundColor =
    color === undefined || color.a < 1
      ? // Chessboard pattern 5
        `repeating-conic-gradient(rgba(0,0,0,0.22) 0% 25%, transparentColor 0% 50%) 0% 33.33% / 40% 40%, ${colord(color).toRgbString()}`
      : colord(color).toRgbString();

  const distanceToStartDrawBorder = 0.15;

  // White color is invisible on white background, so we need to draw border
  // the more color is white the more border is visible
  const borderColor = colord(
    lerpColor(
      transparentColor,
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
      {...rest}
      ref={ref}
      css={{
        backgroundColor,
        borderColor,
      }}
      className={style({ css })}
    />
  );
});

ColorThumb.displayName = "ColorThumb";
