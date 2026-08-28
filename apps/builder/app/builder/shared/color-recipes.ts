import { cssVar } from "@webstudio-is/design-system";

export const builderChromeBackground = `light-dark(
  color-mix(in oklab, ${cssVar("--background-inverse")} 88%, ${cssVar(
    "--background-primary"
  )}),
  ${cssVar("--background-primary")}
)`;

export const builderChromeForeground = `light-dark(
  ${cssVar("--foreground-on-inverse")},
  ${cssVar("--foreground-primary")}
)`;
