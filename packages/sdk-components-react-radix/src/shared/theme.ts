export const fontSize = {
  sm: "0.875rem",
  lg: "1.125rem",
} as const;

export const fontSizeLineHeight = {
  sm: "1.25rem",
  lg: "1.75rem",
} as const;

export const lineHeight = {
  none: "1",
  snug: "1.375",
} as const;

export const weights = {
  medium: "500",
} as const;

export const letterSpacing = {
  tight: "-0.025em",
} as const;

export const spacing = {
  "0": "0px",
  "1": "0.25rem",
  "2": "0.5rem",
  "3": "0.75rem",
  "4": "1rem",
  "5": "1.25rem",
  "6": "1.5rem",
  "7": "1.75rem",
  "8": "2rem",
  "9": "2.25rem",
  "10": "2.5rem",
  "11": "2.75rem",
  "12": "3rem",
  "14": "3.5rem",
  "16": "4rem",
  "20": "5rem",
  "24": "6rem",
  "28": "7rem",
  "32": "8rem",
  "36": "9rem",
  "40": "10rem",
  "44": "11rem",
  "48": "12rem",
  "52": "13rem",
  "56": "14rem",
  "60": "15rem",
  "64": "16rem",
  "72": "18rem",
  "80": "20rem",
  "96": "24rem",
  px: "1px",
  "0.5": "0.125rem",
  "1.5": "0.375rem",
  "2.5": "0.625rem",
  "3.5": "0.875rem",
} as const;

export const width = {
  ...spacing,
  full: "100%",
} as const;

export const height = {
  ...spacing,
  full: "100%",
} as const;

export const maxWidth = {
  "0": "0rem",
  xs: "20rem",
  sm: "24rem",
  md: "28rem",
  lg: "32rem",
  xl: "36rem",
  prose: "65ch",
} as const;

export const borderWidth = {
  "0": "0px",
  "2": "2px",
  "4": "4px",
  "8": "8px",
  DEFAULT: "1px",
};

export const borderRadius = {
  sm: "0.125rem",
  md: "0.375rem",
  full: "9999px",
} as const;

export const colors = {
  transparent: "transparent",
  current: "currentColor",
  inherit: "inherit",
  popover: "rgb(255, 255, 255)",
  popoverForeground: "rgb(2, 8, 23)",
  border: "rgb(226, 232, 240)",
  background: "rgb(255, 255, 255)",
  foreground: "hsl(222.2 84% 4.9%)",
  ring: "rgb(148, 163, 184)",
  mutedForeground: "rgb(100, 116, 139)",
  muted: "hsl(210 40% 96.1%)",
  primary: "rgb(15, 23, 42)",
  primaryForeground: "hsl(210 40% 98%)",
  destructive: "rgb(239, 68, 68)",
  destructiveForeground: "rgb(248, 250, 252)",
  accent: "rgb(241, 245, 249)",
  accentForeground: "rgb(15, 23, 42)",
  input: "rgb(226, 232, 240)",
  secondary: "rgb(241, 245, 249)",
  secondaryForeground: "rgb(15, 23, 42)",
} as const;

export const transition = {
  all: "all 150ms cubic-bezier(0.4, 0, 0.2, 1)",
  transform: "transform 150ms cubic-bezier(0.4, 0, 0.2, 1)",
} as const;

export const opacity = {
  "0": "0",
  "5": "0.05",
  "10": "0.1",
  "20": "0.2",
  "25": "0.25",
  "30": "0.3",
  "40": "0.4",
  "50": "0.5",
  "60": "0.6",
  "70": "0.7",
  "75": "0.75",
  "80": "0.8",
  "90": "0.9",
  "95": "0.95",
  "100": "1",
} as const;

const ringWidth = {
  "0": "0px",
  "1": "1px",
  "2": "2px",
  "4": "4px",
  "8": "8px",
  DEFAULT: "3px",
} as const;

const ringOffsetWidth = {
  "0": "0px",
  "1": "1px",
  "2": "2px",
  "4": "4px",
  "8": "8px",
} as const;

export const boxShadow = {
  sm: "0 1px 2px 0 rgb(0 0 0 / 0.05)",
  md: "0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)",
  lg: "0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)",
  // 0 0 0 ringOffsetWidth ringOffsetColor
  // 0 0 0 ringWidth + ringOffsetWidth ringColor
  ring:
    `0 0 0 ${ringOffsetWidth[2]} ${colors.background}, ` +
    `0 0 0 calc(${ringWidth[2]} + ${ringOffsetWidth[2]}) ${colors.ring}`,
} as const;

export const zIndex = {
  "0": "0",
  "10": "10",
  "20": "20",
  "30": "30",
  "40": "40",
  "50": "50",
} as const;

export const blur = {
  sm: "blur(0 1px 2px 0 rgb(0 0 0 / 0.05))",
};
