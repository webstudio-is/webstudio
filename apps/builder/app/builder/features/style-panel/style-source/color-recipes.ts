import {
  cssVar,
  styleSourceColor,
  rotateBoundedBackgroundHue,
} from "@webstudio-is/design-system";
import {
  toggleGroupBackground,
  withInteractionOverlay,
} from "@webstudio-is/design-system/component-state-color";

const gradient = (color: string) =>
  `linear-gradient(90deg, oklch(from ${color} l c h / 0) 0%, ${color} 31.87%)`;

const accentBackground = cssVar("--background-accent");
const instanceBackground = `color-mix(in oklab, ${cssVar(
  "--background-primary"
)} 86%, ${cssVar("--foreground-primary")})`;
const breakpointBackground = rotateBoundedBackgroundHue(accentBackground, 60);
const neutralBackground = toggleGroupBackground;
const neutralForeground = cssVar("--foreground-primary");

export const styleSourceColors = {
  field: {
    // Stay between the group track and chip hover at any theme surface contrast.
    background: `color-mix(in oklab, ${cssVar(
      "--background-primary"
    )} 92%, ${cssVar("--foreground-primary")})`,
  },
  local: {
    background: styleSourceColor.local.solid,
    foreground: styleSourceColor.local.foreground,
    subtleBackground: styleSourceColor.local.background,
    gradient: gradient(styleSourceColor.local.solid),
  },
  tagStyle: {
    background: styleSourceColor.tagStyle.background,
    foreground: styleSourceColor.tagStyle.foreground,
    gradient: gradient(styleSourceColor.tagStyle.background),
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
    hoverBackground: withInteractionOverlay(neutralBackground),
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
