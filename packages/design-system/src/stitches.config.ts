import { createStitches } from "@stitches/react";
import {
  blue,
  gray,
  green,
  red,
  slate,
  slateA,
  yellow,
  mint,
} from "@radix-ui/colors";
import type * as Stitches from "@stitches/react";
export type { VariantProps } from "@stitches/react";
import * as figma from "./__generated__/figma-design-tokens";

const { styled, css, getCssText, globalCss, keyframes, config, reset } =
  createStitches({
    theme: {
      colors: {
        slate1: slate.slate1,
        slate2: slate.slate2,
        slate3: slate.slate3,
        slate4: slate.slate4,
        slate5: slate.slate5,
        slate7: slate.slate7,
        slate8: slate.slate8,
        slate11: slate.slate11,
        slate12: slate.slate12,
        slateA7: slateA.slateA7,
        slateA8: slateA.slateA8,
        gray2: gray.gray2,
        blue8: blue.blue8,
        blue9: blue.blue9,
        blue10: blue.blue10,
        blue11: blue.blue11,
        red4: red.red4,
        red9: red.red9,
        red11: red.red11,
        green3: green.green3,
        green4: green.green4,
        green9: green.green9,
        green11: green.green11,
        yellow9: yellow.yellow9,
        yellow10: yellow.yellow10,
        mint5: mint.mint5,
        mint9: mint.mint9,
        // Semantic colors
        hiContrast: slate.slate12,
        loContrast: slate.slate1,
        hint: slate.slate9,
        muted: slate.slate6,
        primary: blue.blue10,
        canvas: "hsl(0 0% 93%)",
        panel: "white",
        panelOutline: "hsl(0deg 0% 0% / 10%)",
        transparentPanel: "hsl(0 0% 0% / 97%)",
        shadowLight: "hsl(206 22% 7% / 35%)",
        shadowDark: "hsl(206 22% 7% / 20%)",
        background: slate.slate1,
        text: slate.slate12,
        transparentExtreme: "transparent",

        ...figma.color,
      },
      fonts: {
        ...figma.fontFamilies,
        sans: figma.fontFamilies.inter,
        mono: figma.fontFamilies.robotoMono,
      },

      opacity: {
        1: "0.4",
      },
      spacing: {
        0: "0px",
        1: "1px",
        2: "2px",
        3: "4px",
        4: "6px",
        5: "8px",
        6: "10px",
        7: "12px",
        8: "14px",
        9: "16px",
        10: "20px",
        11: "24px",
        12: "28px",
        13: "32px",
        14: "36px",
        15: "40px",
        16: "44px",
        17: "48px",
        18: "56px",
        19: "64px",
        20: "80px",
        21: "96px",
        22: "112px",
        23: "128px",
        24: "144px",
        25: "160px",
        26: "176px",
        27: "192px",
        28: "208px",
        29: "224px",
        30: "240px",
        31: "256px",
        32: "288px",
        33: "320px",
        34: "384px",
        35: "448px",
      },

      /**
       * Use instead: textVariants / textStyles / <Text />
       */
      deprecatedFontSize: {
        1: "8px",
        2: "10px",
        3: "12px",
        // Legacy - don't use unless specified in Figma
        4: "14px",
        5: "19px",
        6: "21px",
        7: "27px",
        8: "35px",
        9: "59px",
      },

      borderRadius: {
        1: "1px",
        2: "2px",
        3: "3px",
        4: "4px",
        5: "5px",
        6: "6px",
        7: "8px",
        round: "50%",
        pill: "9999px",
      },
      zIndices: {
        1: "100",
        2: "200",
        3: "300",
        4: "400",
        max: "999",
      },
      easing: {
        easeOutQuart: "cubic-bezier(0.25, 1, 0.5, 1)",
        easeOut: "cubic-bezier(0.16, 1, 0.3, 1)",
      },
      shadows: figma.boxShadow,
    },
    media: {
      tablet: "(min-width: 768px)",
      laptop: "(min-width: 1024px)",
      desktop: "(min-width: 1280px)",
      motion: "(prefers-reduced-motion)",
      hover: "(any-hover: hover)",
      dark: "(prefers-color-scheme: dark)",
      light: "(prefers-color-scheme: light)",
    },
    utils: {
      p: (value: Stitches.PropertyValue<"padding">) => ({
        padding: value,
      }),
      pt: (value: Stitches.PropertyValue<"paddingTop">) => ({
        paddingTop: value,
      }),
      pr: (value: Stitches.PropertyValue<"paddingRight">) => ({
        paddingRight: value,
      }),
      pb: (value: Stitches.PropertyValue<"paddingBottom">) => ({
        paddingBottom: value,
      }),
      pl: (value: Stitches.PropertyValue<"paddingLeft">) => ({
        paddingLeft: value,
      }),
      px: (value: Stitches.PropertyValue<"paddingLeft">) => ({
        paddingLeft: value,
        paddingRight: value,
      }),
      py: (value: Stitches.PropertyValue<"paddingTop">) => ({
        paddingTop: value,
        paddingBottom: value,
      }),

      m: (value: Stitches.PropertyValue<"margin">) => ({
        margin: value,
      }),
      mt: (value: Stitches.PropertyValue<"marginTop">) => ({
        marginTop: value,
      }),
      mr: (value: Stitches.PropertyValue<"marginRight">) => ({
        marginRight: value,
      }),
      mb: (value: Stitches.PropertyValue<"marginBottom">) => ({
        marginBottom: value,
      }),
      ml: (value: Stitches.PropertyValue<"marginLeft">) => ({
        marginLeft: value,
      }),
      mx: (value: Stitches.PropertyValue<"marginLeft">) => ({
        marginLeft: value,
        marginRight: value,
      }),
      my: (value: Stitches.PropertyValue<"marginTop">) => ({
        marginTop: value,
        marginBottom: value,
      }),

      userSelect: (value: Stitches.PropertyValue<"userSelect">) => ({
        WebkitUserSelect: value,
        userSelect: value,
      }),

      size: (value: Stitches.PropertyValue<"width">) => ({
        width: value,
        height: value,
      }),

      appearance: (value: Stitches.PropertyValue<"appearance">) => ({
        WebkitAppearance: value,
        appearance: value,
      }),
      backgroundClip: (value: Stitches.PropertyValue<"backgroundClip">) => ({
        WebkitBackgroundClip: value,
        backgroundClip: value,
      }),

      // LEGACY, please don't use them
      as: (value: Stitches.PropertyValue<"alignSelf">) => ({
        alignSelf: value,
      }),
      fg: (value: Stitches.PropertyValue<"flexGrow">) => ({ flexGrow: value }),
      bc: (value: Stitches.PropertyValue<"backgroundColor">) => ({
        backgroundColor: value,
      }),
    },
  });

type VariblesValues = typeof config.theme;

type VariblesNames = {
  [GroupKey in keyof VariblesValues]: {
    [VariableKey in keyof VariblesValues[GroupKey]]: string;
  };
};

const toVariblesNames = (values: VariblesValues): VariblesNames => {
  const result: Record<string, Record<string, string>> = {};
  for (const groupKey in values) {
    const group = values[groupKey as keyof VariblesValues];
    const groupResult: Record<string, string> = {};
    for (const variableKey in group) {
      groupResult[variableKey] = `$${groupKey}$${variableKey}`;
    }
    result[groupKey] = groupResult;
  }
  return result as VariblesNames;
};

export const theme = toVariblesNames(config.theme);

export const rawTheme = config.theme;

export type CSS = Stitches.CSS<typeof config>;

export { styled, css, globalCss, keyframes, config };

export const flushCss = () => {
  const css = getCssText();
  reset();
  return css;
};
