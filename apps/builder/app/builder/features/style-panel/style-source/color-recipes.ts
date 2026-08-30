import {
  cssVar,
  styleSourceColor,
  rotateBoundedBackgroundHue,
} from "@webstudio-is/design-system";

const gradient = (color: string) =>
  `linear-gradient(90deg, oklch(from ${color} l c h / 0) 0%, ${color} 31.87%)`;

const accentBackground = cssVar("--background-accent");
const instanceBackground = `color-mix(in oklab, ${cssVar(
  "--background-primary"
)} 86%, ${cssVar("--foreground-primary")})`;
const tagBackground = rotateBoundedBackgroundHue(accentBackground, 150);
const tagForeground = tagBackground;
const breakpointBackground = rotateBoundedBackgroundHue(accentBackground, 60);
const neutralBackground = `light-dark(
  ${cssVar("--foreground-secondary")},
  color-mix(
    in oklab,
    ${cssVar("--background-primary")} 67%,
    ${cssVar("--foreground-primary")}
  )
)`;
const neutralForeground = `light-dark(
  ${cssVar("--foreground-on-inverse")},
  ${cssVar("--foreground-primary")}
)`;

export const styleSourceColors = {
  local: {
    background: styleSourceColor.local.solid,
    foreground: styleSourceColor.local.foreground,
    subtleBackground: styleSourceColor.local.background,
    gradient: gradient(styleSourceColor.local.solid),
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
    foreground: styleSourceColor.overwritten.foreground,
    subtleBackground: styleSourceColor.overwritten.background,
  },
  remote: {
    foreground: styleSourceColor.remote.foreground,
    subtleBackground: styleSourceColor.remote.background,
  },
  neutral: {
    background: neutralBackground,
    foreground: neutralForeground,
    gradient: gradient(neutralBackground),
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
  return cssVar("--foreground-secondary");
};
