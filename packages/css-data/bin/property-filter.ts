// Only a small subset of non-standard MDN properties are intentionally
// included in generated CSS data. Keeping this explicit avoids silently
// widening support whenever MDN adds or reshapes experimental entries.
export const supportedExperimentalProperties = [
  "field-sizing",
  "text-size-adjust",
  "-webkit-tap-highlight-color",
  "-webkit-overflow-scrolling",
] as const;

export const supportedExperimentalPropertySet = new Set<string>(
  supportedExperimentalProperties
);
