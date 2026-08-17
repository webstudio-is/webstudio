// Only a small subset of non-standard MDN properties are intentionally
// included in generated CSS data. Keeping this explicit avoids silently
// widening support whenever MDN adds or reshapes experimental entries.
export const anchorPositioningProperties = [
  "anchor-name",
  "anchor-scope",
  "position-anchor",
  "position-area",
  "position-try",
  "position-try-fallbacks",
  "position-try-order",
  "position-visibility",
] as const;

export const supportedExperimentalProperties: readonly string[] = [
  ...anchorPositioningProperties,
  "field-sizing",
  "text-size-adjust",
  "-webkit-tap-highlight-color",
  "-webkit-overflow-scrolling",
] as const;

export const supportedExperimentalPropertySet: Set<string> = new Set<string>(
  supportedExperimentalProperties
);
