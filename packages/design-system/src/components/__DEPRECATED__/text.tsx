import { styled } from "../../stitches.config";
import { theme } from "../../stitches.config";

export const DeprecatedText = styled("div", {
  // Reset
  lineHeight: "1",
  margin: "0",
  fontWeight: 400,
  fontVariantNumeric: "tabular-nums",
  display: "block",
  userSelect: "none",

  variants: {
    size: {
      "1": {
        fontSize: theme.deprecatedFontSize[3],
      },
      "2": {
        fontSize: theme.deprecatedFontSize[3],
      },
      "3": {
        fontSize: theme.deprecatedFontSize[4],
      },
      "4": {
        fontSize: theme.deprecatedFontSize[4],
      },
      "5": {
        fontSize: theme.deprecatedFontSize[5],
        letterSpacing: "-.015em",
      },
      "6": {
        fontSize: theme.deprecatedFontSize[6],
        letterSpacing: "-.016em",
      },
      "7": {
        fontSize: theme.deprecatedFontSize[7],
        letterSpacing: "-.031em",
        textIndent: "-.005em",
      },
      "8": {
        fontSize: theme.deprecatedFontSize[8],
        letterSpacing: "-.034em",
        textIndent: "-.018em",
      },
      "9": {
        fontSize: theme.deprecatedFontSize[9],
        letterSpacing: "-.055em",
        textIndent: "-.025em",
      },
    },
    variant: {
      red: {
        color: theme.colors.red11,
      },
      crimson: {
        color: theme.colors.crimson11,
      },
      pink: {
        color: theme.colors.pink11,
      },
      purple: {
        color: theme.colors.purple11,
      },
      violet: {
        color: theme.colors.violet11,
      },
      indigo: {
        color: theme.colors.indigo11,
      },
      blue: {
        color: theme.colors.blue11,
      },
      cyan: {
        color: theme.colors.cyan11,
      },
      teal: {
        color: theme.colors.teal11,
      },
      green: {
        color: theme.colors.green11,
      },
      lime: {
        color: theme.colors.lime11,
      },
      yellow: {
        color: theme.colors.yellow11,
      },
      orange: {
        color: theme.colors.orange11,
      },
      gold: {
        color: theme.colors.gold11,
      },
      bronze: {
        color: theme.colors.bronze11,
      },
      gray: {
        color: theme.colors.slate11,
      },
      contrast: {
        color: theme.colors.hiContrast,
      },
      loContrast: {
        color: theme.colors.loContrast,
      },
    },
    gradient: {
      true: {
        WebkitBackgroundClip: "text",
        WebkitTextFillColor: "transparent",
      },
    },
  },
  compoundVariants: [
    {
      variant: "red",
      gradient: "true",
      css: {
        background: `linear-gradient(to right, ${theme.colors.red11}, ${theme.colors.crimson11})`,
      },
    },
    {
      variant: "crimson",
      gradient: "true",
      css: {
        background: `linear-gradient(to right, ${theme.colors.crimson11}, ${theme.colors.pink11})`,
      },
    },
    {
      variant: "pink",
      gradient: "true",
      css: {
        background: `linear-gradient(to right, ${theme.colors.pink11}, ${theme.colors.purple11})`,
      },
    },
    {
      variant: "purple",
      gradient: "true",
      css: {
        background: `linear-gradient(to right, ${theme.colors.purple11}, ${theme.colors.violet11})`,
      },
    },
    {
      variant: "violet",
      gradient: "true",
      css: {
        background: `linear-gradient(to right, ${theme.colors.violet11}, ${theme.colors.indigo11})`,
      },
    },
    {
      variant: "indigo",
      gradient: "true",
      css: {
        background: `linear-gradient(to right, ${theme.colors.indigo11}, ${theme.colors.blue11})`,
      },
    },
    {
      variant: "blue",
      gradient: "true",
      css: {
        background: `linear-gradient(to right, ${theme.colors.blue11}, ${theme.colors.cyan11})`,
      },
    },
    {
      variant: "cyan",
      gradient: "true",
      css: {
        background: `linear-gradient(to right, ${theme.colors.cyan11}, ${theme.colors.teal11})`,
      },
    },
    {
      variant: "teal",
      gradient: "true",
      css: {
        background: `linear-gradient(to right, ${theme.colors.teal11}, ${theme.colors.green11})`,
      },
    },
    {
      variant: "green",
      gradient: "true",
      css: {
        background: `linear-gradient(to right, ${theme.colors.green11}, ${theme.colors.lime11})`,
      },
    },
    {
      variant: "lime",
      gradient: "true",
      css: {
        background: `linear-gradient(to right, ${theme.colors.lime11}, ${theme.colors.yellow11})`,
      },
    },
    {
      variant: "yellow",
      gradient: "true",
      css: {
        background: `linear-gradient(to right, ${theme.colors.yellow11}, ${theme.colors.orange11})`,
      },
    },
    {
      variant: "orange",
      gradient: "true",
      css: {
        background: `linear-gradient(to right, ${theme.colors.orange11}, ${theme.colors.red11})`,
      },
    },
    {
      variant: "gold",
      gradient: "true",
      css: {
        background: `linear-gradient(to right, ${theme.colors.gold11}, ${theme.colors.gold9})`,
      },
    },
    {
      variant: "bronze",
      gradient: "true",
      css: {
        background: `linear-gradient(to right, ${theme.colors.bronze11}, ${theme.colors.bronze9})`,
      },
    },
    {
      variant: "gray",
      gradient: "true",
      css: {
        background: `linear-gradient(to right, ${theme.colors.gray11}, ${theme.colors.gray12})`,
      },
    },
    {
      variant: "contrast",
      gradient: "true",
      css: {
        background: `linear-gradient(to right, ${theme.colors.hiContrast}, ${theme.colors.gray12})`,
      },
    },
  ],
  defaultVariants: {
    size: "3",
    variant: "contrast",
  },
});
