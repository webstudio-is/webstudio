import { cssVar } from "@webstudio-is/design-system";

const accent = cssVar("--background-accent");

// Canvas overlays visualize editing state rather than application UI intent.
// Keep their small palette relative to the theme accent.
export const canvasToolColors = {
  selection: accent,
  selectionTranslucent: `oklch(from ${accent} l c h / 0.7)`,
  selectionSubtle: `color-mix(in oklab, ${accent} 12%, transparent)`,
  slot: cssVar("--background-accent-secondary"),
  onSlot: cssVar("--foreground-on-accent-secondary"),
  onSelection: cssVar("--foreground-on-accent"),
} as const;
