// eslint-disable-next-line import/no-internal-modules
import defaultTheme from "tailwindcss/defaultTheme"; // Imported theme https://github.com/tailwindlabs/tailwindcss/blob/e0c52a9332a64ef7eb0ba23d2a0fd5a16fe57ab7/stubs/config.full.js
import type { EvaluatedDefaultTheme } from "./radix-common-types";
import { colors } from "./tailwind-colors";

// Override the default theme with our own colors and other values if needed
const localTheme = { ...defaultTheme };

export const theme = <T extends keyof EvaluatedDefaultTheme>(
  name: T
): EvaluatedDefaultTheme[T] => {
  const value = localTheme?.[name] as unknown;

  if (typeof value === "function") {
    return value({ theme, colors });
  }

  return value as never;
};

// Override with our own colors, and other values if needed
localTheme.colors = colors;
localTheme.borderRadius = { ...theme("borderRadius") };
localTheme.borderRadius.DEFAULT = "0.5rem";
