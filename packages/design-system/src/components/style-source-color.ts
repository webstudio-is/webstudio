import { cssVar } from "../css-var";
import { rotateBoundedBackgroundHue } from "../color-utils";

const rotateForegroundHue = (color: string, degrees: number) =>
  `color(
    from oklch(from ${color} l c calc(h + ${degrees}))
    srgb clamp(0, r, 1) clamp(0, g, 1) clamp(0, b, 1)
  )`;

const createStyleSourceColor = (solid: string, foreground: string) => ({
  solid,
  background: `color-mix(in oklab, ${solid} 16%, ${cssVar(
    "--background-primary"
  )})`,
  border: `color-mix(in oklab, ${solid} 44%, ${cssVar(
    "--background-primary"
  )})`,
  foreground: `light-dark(color-mix(in oklab, ${foreground} 86%, ${cssVar(
    "--foreground-primary"
  )}), ${foreground})`,
});

const accentBackground = cssVar("--background-accent");
const accentForeground = cssVar("--foreground-accent");

// Style-source states are a component domain, not information, warning, or
// error intent. Tag styles share the global Slot color; the other source
// colors derive from the theme accent.
export const styleSourceColor = {
  tag: {
    background: cssVar("--background-accent-secondary"),
    border: cssVar("--background-accent-secondary"),
    foreground: cssVar("--foreground-on-accent-secondary"),
  },
  local: createStyleSourceColor(accentBackground, accentForeground),
  overwritten: createStyleSourceColor(
    rotateBoundedBackgroundHue(accentBackground, 100),
    rotateForegroundHue(accentForeground, 100)
  ),
  remote: createStyleSourceColor(
    rotateBoundedBackgroundHue(accentBackground, 150),
    rotateForegroundHue(accentForeground, 150)
  ),
} as const;
