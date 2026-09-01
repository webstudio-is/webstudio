import { cssVar } from "../css-var";

export const selectionBackground = `light-dark(
  color-mix(in oklab, ${cssVar("--background-accent")} 12%, ${cssVar(
    "--background-primary"
  )}),
  color-mix(in oklab, ${cssVar("--background-accent")} 20%, ${cssVar(
    "--background-primary"
  )})
)`;

export const textSelectionBackground = cssVar("--background-text-selection");
