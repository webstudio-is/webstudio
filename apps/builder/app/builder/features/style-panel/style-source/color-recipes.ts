import {
  cssVar,
  rotateBoundedBackgroundHue,
} from "@webstudio-is/design-system";

const subtleBackground = (color: string) =>
  `color-mix(in oklab, ${color} 12%, ${cssVar("--background-primary")})`;

const gradient = (color: string) =>
  `linear-gradient(90deg, oklch(from ${color} l c h / 0) 0%, ${color} 31.87%)`;

const accentBackground = cssVar("--background-accent");
const accentForeground = cssVar("--foreground-accent");
const instanceBackground = `color-mix(in oklab, ${cssVar(
  "--background-primary"
)} 86%, ${cssVar("--foreground-primary")})`;
const tagBackground = rotateBoundedBackgroundHue(accentBackground, 150);
const tagForeground = tagBackground;
const breakpointBackground = rotateBoundedBackgroundHue(accentBackground, 60);
const overwrittenForeground = cssVar("--foreground-negative");
const remoteForeground = tagForeground;

export const styleSourceColors = {
  local: {
    background: accentBackground,
    foreground: accentForeground,
    subtleBackground: subtleBackground(accentForeground),
    gradient: gradient(accentBackground),
  },
  tag: {
    background: tagBackground,
    foreground: tagForeground,
    gradient: gradient(tagBackground),
  },
  breakpoint: {
    background: breakpointBackground,
  },
  overwritten: {
    foreground: overwrittenForeground,
    subtleBackground: subtleBackground(overwrittenForeground),
  },
  remote: {
    foreground: remoteForeground,
    subtleBackground: subtleBackground(remoteForeground),
  },
  neutral: {
    background: cssVar("--foreground-secondary"),
    gradient: gradient(cssVar("--foreground-secondary")),
  },
  instance: {
    background: instanceBackground,
  },
} as const;

export const getStyleSourceForeground = (source: string) => {
  if (source === "local") {
    return styleSourceColors.local.foreground;
  }
  if (source === "overwritten") {
    return styleSourceColors.overwritten.foreground;
  }
  if (source === "remote") {
    return styleSourceColors.remote.foreground;
  }
  return cssVar("--foreground-disabled");
};
