import { cssVar } from "../css-var";

// A resting control boundary must retain 3:1 contrast against its panel.
export const restingControlBoundary = `color-mix(in oklab, ${cssVar(
  "--foreground-primary"
)} 45%, ${cssVar("--background-primary")})`;
