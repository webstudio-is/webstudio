import { cssVar } from "../css-var";

// Selected controls need more separation in dark mode, while remaining neutral.
// This is a component-state composition, not a theme parameter.
export const selectedControlBackground = `light-dark(
  color-mix(in oklab, ${cssVar("--background-primary")} 86%, ${cssVar(
  "--foreground-primary"
)}),
  color-mix(in oklab, ${cssVar("--background-primary")} 78%, ${cssVar(
  "--foreground-primary"
)})
)`;

export const withInteractionOverlay = (
  background: string,
  overlay = cssVar("--overlay-interaction-hover")
) => `linear-gradient(${overlay}, ${overlay}), ${background}`;

export const selectedControlHoverBackground = withInteractionOverlay(
  selectedControlBackground,
  cssVar("--overlay-interaction-hover")
);

export const selectedControlPressedBackground = withInteractionOverlay(
  selectedControlBackground,
  cssVar("--overlay-interaction-pressed")
);
