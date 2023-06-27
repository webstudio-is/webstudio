import { parseCssValue, type RgbValue } from "@webstudio-is/css-data";
import type { StyleDecl } from "@webstudio-is/project-build";

const backgroundProperties = ["backgroundColor", "background"];
const foregroundProperties = ["color"];

export const getPalette = (styles: StyleDecl[], asHex = true) => {
  const palette: string[] = [];
  let colorMode: "light" | "dark" = "light";

  const backgroundColors: RgbValue[] = [];
  const foregroundColors: RgbValue[] = [];

  styles.forEach(({ property, value }) => {
    let color = null;

    if (value.type === "rgb") {
      color = value;
    } else if (
      value.type === "keyword" &&
      property.toLowerCase().includes("color")
    ) {
      const parsed = parseCssValue(property, value.value);
      if (parsed.type === "rgb") {
        color = parsed;
      } else {
        palette.push(value.value);
      }
    }

    if (color) {
      palette.push(
        asHex
          ? rgbaToHex(color)
          : `rgba(${color.r}, ${color.g}, ${color.b}, ${color.alpha})`
      );

      if (backgroundProperties.includes(property)) {
        backgroundColors.push(color);
      }

      if (foregroundProperties.includes(property)) {
        foregroundColors.push(color);
      }
    }
  });

  if (backgroundColors.length > 0 && foregroundColors.length > 0) {
    const backgroundLuminance = getAverageLuminance(backgroundColors);
    const foregroundLuminance = getAverageLuminance(foregroundColors);

    if (backgroundLuminance > foregroundLuminance) {
      colorMode = "light";
    } else {
      colorMode = "dark";
    }
  }

  return {
    palette: [...new Set(palette)],
    colorMode,
  };
};

export const convertThemeColorsToRgbValue = (theme) => {
  for (const name in theme.background) {
    theme.background[name] = hexToRgbValue(theme.background[name]);
  }
  for (const name in theme.foreground) {
    theme.foreground[name] = hexToRgbValue(theme.foreground[name]);
  }
  theme.gradients = theme.gradients.map((gradient) =>
    gradient.map(hexToRgbValue)
  );
  return theme;
};

export const hexToRgbValue = function (color: string): RgbValue {
  const parsed = parseCssValue("color", color);
  if (parsed.type === "rgb") {
    return parsed;
  }

  return {
    type: "rgb",
    r: 0,
    g: 0,
    b: 0,
    alpha: 0,
  };
};

export const rgbaToHex = function rgbaToHex(color: RgbValue): string {
  const { r, g, b, alpha } = color;

  // Convert the decimal color components to hexadecimal strings
  const rHex = Math.round(r).toString(16).padStart(2, "0");
  const gHex = Math.round(g).toString(16).padStart(2, "0");
  const bHex = Math.round(b).toString(16).padStart(2, "0");
  const aHex =
    alpha < 1
      ? Math.round(alpha * 255)
          .toString(16)
          .padStart(2, "0")
      : "";

  // Combine the hexadecimal color components
  const hex = `#${rHex}${gHex}${bHex}${aHex}`;

  return hex;
};

const getAverageLuminance = (colors: RgbValue[]): number => {
  let totalLuminance = 0;

  colors.forEach((color) => {
    const { r, g, b } = color;
    const luminance = (r * 0.299 + g * 0.587 + b * 0.114) / 255;
    totalLuminance += luminance;
  });

  return totalLuminance / colors.length;
};
