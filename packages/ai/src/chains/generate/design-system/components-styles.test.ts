import { describe, expect, test } from "@jest/globals";
import { EmbedTemplateStyleDecl } from "@webstudio-is/react-sdk";
import { convertThemeColorsToRgbValue } from "../../../utils/get-palette";
import { componentsStyles } from "./components-styles";

describe("components styles", () => {
  for (const [componentName, styles] of Object.entries(componentsStyles)) {
    for (const [variantName, getVariantStyles] of Object.entries(styles)) {
      test(`${componentName}.${variantName} styles are valid`, () => {
        const styleDecls = getVariantStyles(theme);
        styleDecls.forEach((styleDecl) => {
          expect(() => EmbedTemplateStyleDecl.parse(styleDecl)).not.toThrow();
        });
      });
    }
  }
});

const theme = convertThemeColorsToRgbValue({
  fontSize: [10, 12, 14, 16, 18, 20, 24, 28],
  spacing: [4, 8, 12, 16, 20, 24, 28, 32],
  borderRadius: [2, 4, 6, 8, 10, 12, 16, 20],
  background: {
    base: "#1A202C",
    accent: "#2D3748",
    secondary: "#4A5568",
    subtle: "#CBD5E0",
    input: "#2D3748",
  },
  foreground: {
    base: "#E2E8F0",
    accent: "#A0AEC0",
    secondary: "#718096",
    subtle: "#A0AEC0",
    input: "#E2E8F0",
  },
  gradients: [
    ["#2D3748", "#4A5568"],
    ["#4A5568", "#718096"],
    ["#718096", "#A0AEC0"],
  ],
  fontFamily: {
    base: "sans-serif",
    headings: "sans-serif",
  },
  shadowsColors: [
    "rgba(0, 0, 0, 0.1)",
    "rgba(0, 0, 0, 0.2)",
    "rgba(0, 0, 0, 0.3)",
    "rgba(0, 0, 0, 0.4)",
  ],
});
