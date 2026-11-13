// Design tokens used by the Webstudio design system.

export const boxShadow = {
  menuDropShadow: "0px 2px 7px 0px #0000001a, 0px 5px 17px 0px #0000004d",
  brandElevationSmall: "0px 4px 4px 0px #1717171a",
  brandElevationBig: "0px 8px 16px 0px #1717171a",
  panelSectionDropShadow:
    "0px 4px 15px 0px #00000014, 0px 1px 7px 0px #00000014",
} as const;

export const fontFamilies = {
  inter:
    "Inter Variable, InterVariable, Inter, -apple-system, system-ui, sans-serif",
  manrope: "Manrope Variable, ManropeVariable, Manrope, sans-serif",
  robotoMono: "Roboto Mono, RobotoMono, menlo, monospace",
} as const;

export const lineHeights = {
  "0": "16px",
  "1": "8px",
  "2": "12px",
  "3": "10px",
  "4": "39px",
  "5": "11px",
  "6": "27px",
  "7": "58px",
  "8": "22px",
  "9": "38px",
  "10": "260px",
} as const;

export const fontWeights = {
  inter_0: 400,
  inter_1: 700,
  inter_2: 500,
  inter_3: 700,
  inter_4: 600,
  robotoMono_4: 700,
  manrope_5: 700,
  manrope_6: 400,
  manrope_7: 600,
  manrope_8: 200,
  manrope_9: 800,
  robotoMono_3: 500,
  inter_5: 600,
  manrope_10: 800,
} as const;

export const letterSpacing = {
  "0": "0.005em",
  "1": "0.01em",
  "2": "0em",
  "3": "-0.02em",
  "4": "0.02em",
  "5": "-0.05em",
} as const;

export const paragraphSpacing = { "0": 0 } as const;

export const typography = {
  regular: {
    fontFamily:
      "Inter Variable, InterVariable, Inter, -apple-system, system-ui, sans-serif",
    fontWeight: 400,
    fontSize: "12px",
    lineHeight: "16px",
    letterSpacing: "0.005em",
    textTransform: "none",
    textDecoration: "none",
    textIndent: "0px",
  },
  labels: {
    fontFamily:
      "Inter Variable, InterVariable, Inter, -apple-system, system-ui, sans-serif",
    fontWeight: 500,
    fontSize: "12px",
    lineHeight: "16px",
    letterSpacing: "0.005em",
    textDecoration: "none",
    textIndent: "0px",
  },
  titles: {
    fontFamily:
      "Inter Variable, InterVariable, Inter, -apple-system, system-ui, sans-serif",
    fontWeight: 700,
    fontSize: "12px",
    lineHeight: "16px",
    letterSpacing: "0.01em",
    textDecoration: "none",
    textIndent: "0px",
  },
  small: {
    fontFamily:
      "Inter Variable, InterVariable, Inter, -apple-system, system-ui, sans-serif",
    fontWeight: 400,
    fontSize: "10px",
    lineHeight: "11px",
    letterSpacing: "0.01em",
    textTransform: "none",
    textDecoration: "none",
    textIndent: "0px",
  },
  tiny: {
    fontFamily:
      "Inter Variable, InterVariable, Inter, -apple-system, system-ui, sans-serif",
    fontWeight: 500,
    fontSize: "8px",
    lineHeight: "8px",
    letterSpacing: "0.01em",
    textTransform: "none",
    textDecoration: "none",
    textIndent: "0px",
  },
  unit: {
    fontFamily:
      "Inter Variable, InterVariable, Inter, -apple-system, system-ui, sans-serif",
    fontWeight: 500,
    fontSize: "10px",
    lineHeight: "12px",
    letterSpacing: "0em",
    textTransform: "uppercase",
    textDecoration: "none",
    textIndent: "0px",
  },
  mono: {
    fontFamily: "Roboto Mono, RobotoMono, menlo, monospace",
    fontWeight: 500,
    fontSize: "12px",
    lineHeight: "16px",
    letterSpacing: "0em",
    textTransform: "none",
    textDecoration: "none",
    textIndent: "0px",
  },
  bigTitle: {
    fontFamily:
      "Inter Variable, InterVariable, Inter, -apple-system, system-ui, sans-serif",
    fontWeight: 500,
    fontSize: "32px",
    lineHeight: "39px",
    letterSpacing: "0.005em",
    textTransform: "none",
    textDecoration: "none",
    textIndent: "0px",
  },
  spaceSectionUnitText: {
    fontFamily:
      "Inter Variable, InterVariable, Inter, -apple-system, system-ui, sans-serif",
    fontWeight: 500,
    fontSize: "8px",
    lineHeight: "8px",
    letterSpacing: "0.01em",
    textTransform: "uppercase",
    textDecoration: "none",
    textIndent: "0px",
  },
  spaceSectionValueText: {
    fontFamily:
      "Inter Variable, InterVariable, Inter, -apple-system, system-ui, sans-serif",
    fontWeight: 500,
    fontSize: "10px",
    lineHeight: "10px",
    letterSpacing: "0.01em",
    textTransform: "none",
    textDecoration: "none",
    textIndent: "0px",
  },
  brandLargeTitle: {
    fontFamily: "Manrope Variable, ManropeVariable, Manrope, sans-serif",
    fontWeight: 700,
    fontSize: "48px",
    lineHeight: "58px",
    letterSpacing: "-0.02em",
    textTransform: "none",
    textDecoration: "none",
    textIndent: "0px",
  },
  brandMediumTitle: {
    fontFamily: "Manrope Variable, ManropeVariable, Manrope, sans-serif",
    fontWeight: 700,
    fontSize: "32px",
    lineHeight: "38px",
    letterSpacing: "-0.02em",
    textTransform: "none",
    textDecoration: "none",
    textIndent: "0px",
  },
  brandSectionTitle: {
    fontFamily: "Manrope Variable, ManropeVariable, Manrope, sans-serif",
    fontWeight: 700,
    fontSize: "20px",
    lineHeight: "27px",
    letterSpacing: "0em",
    textTransform: "none",
    textDecoration: "none",
    textIndent: "0px",
  },
  brandRegular: {
    fontFamily: "Manrope Variable, ManropeVariable, Manrope, sans-serif",
    fontWeight: 400,
    fontSize: "16px",
    lineHeight: "22px",
    letterSpacing: "0em",
    textTransform: "none",
    textDecoration: "none",
    textIndent: "0px",
  },
  brandSmall: {
    fontFamily: "Manrope Variable, ManropeVariable, Manrope, sans-serif",
    fontWeight: 600,
    fontSize: "12px",
    lineHeight: "16px",
    letterSpacing: "0.02em",
    textTransform: "none",
    textDecoration: "none",
    textIndent: "0px",
  },
  brandThumbnailLargeDefault: {
    fontFamily: "Manrope Variable, ManropeVariable, Manrope, sans-serif",
    fontWeight: 200,
    fontSize: "260px",
    lineHeight: "260px",
    letterSpacing: "-0.05em",
    textTransform: "none",
    textDecoration: "none",
    textIndent: "0px",
  },
  brandThumbnailLargeHover: {
    fontFamily: "Manrope Variable, ManropeVariable, Manrope, sans-serif",
    fontWeight: 800,
    fontSize: "260px",
    lineHeight: "260px",
    letterSpacing: "-0.05em",
    textTransform: "none",
    textDecoration: "none",
    textIndent: "0px",
  },
  brandThumbnailSmallDefault: {
    fontFamily: "Manrope Variable, ManropeVariable, Manrope, sans-serif",
    fontWeight: 400,
    fontSize: "48px",
    lineHeight: "58px",
    letterSpacing: "-0.02em",
    textTransform: "none",
    textDecoration: "none",
    textIndent: "0px",
  },
  brandThumbnailSmallHover: {
    fontFamily: "Manrope Variable, ManropeVariable, Manrope, sans-serif",
    fontWeight: 800,
    fontSize: "48px",
    lineHeight: "58px",
    letterSpacing: "-0.02em",
    textTransform: "none",
    textDecoration: "none",
    textIndent: "0px",
  },
  brandButtonRegular: {
    fontFamily: "Manrope Variable, ManropeVariable, Manrope, sans-serif",
    fontWeight: 600,
    fontSize: "16px",
    lineHeight: "22px",
    letterSpacing: "0em",
    textTransform: "none",
    textDecoration: "none",
    textIndent: "0px",
  },
  brandButtonCta: {
    fontFamily: "Manrope Variable, ManropeVariable, Manrope, sans-serif",
    fontWeight: 700,
    fontSize: "32px",
    lineHeight: "39px",
    letterSpacing: "-0.02em",
    textTransform: "none",
    textDecoration: "none",
    textIndent: "0px",
  },
  regularBold: {
    fontFamily:
      "Inter Variable, InterVariable, Inter, -apple-system, system-ui, sans-serif",
    fontWeight: 700,
    fontSize: "12px",
    lineHeight: "16px",
    letterSpacing: "0.005em",
    textTransform: "none",
    textDecoration: "none",
    textIndent: "0px",
  },
  monoBold: {
    fontFamily: "Roboto Mono, RobotoMono, menlo, monospace",
    fontWeight: 700,
    fontSize: "12px",
    lineHeight: "16px",
    letterSpacing: "0em",
    textTransform: "none",
    textDecoration: "none",
    textIndent: "0px",
  },
  link: {
    fontFamily:
      "Inter Variable, InterVariable, Inter, -apple-system, system-ui, sans-serif",
    fontWeight: 400,
    fontSize: "12px",
    lineHeight: "16px",
    letterSpacing: "0.005em",
    textTransform: "none",
    textDecoration: "underline",
    textIndent: "0px",
  },
  regularLink: {
    fontFamily:
      "Inter Variable, InterVariable, Inter, -apple-system, system-ui, sans-serif",
    fontWeight: 400,
    fontSize: "12px",
    lineHeight: "16px",
    letterSpacing: "0.005em",
    textTransform: "none",
    textDecoration: "underline",
    textIndent: "0px",
  },
  labelLink: {
    fontFamily:
      "Inter Variable, InterVariable, Inter, -apple-system, system-ui, sans-serif",
    fontWeight: 500,
    fontSize: "12px",
    lineHeight: "16px",
    letterSpacing: "0.005em",
    textTransform: "none",
    textDecoration: "underline",
    textIndent: "0px",
  },
  monoBoldLink: {
    fontFamily: "Roboto Mono, RobotoMono, menlo, monospace",
    fontWeight: 700,
    fontSize: "12px",
    lineHeight: "16px",
    letterSpacing: "0em",
    textTransform: "none",
    textDecoration: "underline",
    textIndent: "0px",
  },
  monoLink: {
    fontFamily: "Roboto Mono, RobotoMono, menlo, monospace",
    fontWeight: 500,
    fontSize: "12px",
    lineHeight: "16px",
    letterSpacing: "0em",
    textTransform: "none",
    textDecoration: "underline",
    textIndent: "0px",
  },
} as const;

export const textCase = {
  none: "none",
  uppercase: "uppercase",
  capitalize: "capitalize",
} as const;

export const textDecoration = { none: "none", underline: "underline" } as const;

export const borderRadius = {
  "0": "1px",
  "1": "2px",
  "2": "3px",
  "3": "4px",
  "4": "5px",
  "5": "6px",
} as const;

export const borderWidth = { "0": 1, "1": 2 } as const;

export const dimension = { paragraphIndent_0: "0px" } as const;

export const fontSizes = {
  fontSize_0: "8px",
  fontSize_1: "10px",
  fontSize_2: "12px",
  fontSize_3: "16px",
  fontSize_4: "20px",
  fontSize_5: "32px",
  fontSize_6: "48px",
  fontSize_7: "260px",
} as const;

export const other = { tokenSetOrder_0: "global" } as const;
