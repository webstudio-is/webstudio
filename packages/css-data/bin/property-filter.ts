const supportedNonstandardPropertySet = new Set([
  "-webkit-tap-highlight-color",
  "-webkit-overflow-scrolling",
]);

export const isSupportedProperty = (
  property: string,
  status: string | undefined,
  hasMdnUrl: boolean
): boolean =>
  status === "experimental" ||
  (status === "standard" && hasMdnUrl) ||
  supportedNonstandardPropertySet.has(property);
