export * from "./context";
export * from "./hook";
export * from "./variable-state";
export { PageSettingsMeta } from "./page-settings-meta";
export { PageSettingsTitle } from "./page-settings-title";
export { PageSettingsCanonicalLink } from "./page-settings-canonical-link";

/**
 * React has issues rendering certain elements, such as errors when a <link> element has children.
 * To render XML, we wrap it with an <svg> tag and add a suffix to avoid React's default behavior on these elements.
 */
export const xmlNodeTagSuffix =
  "-ws-xml-node-fb77f896-8e96-40b9-b8f8-90a4e70d724a";

export const getIndexWithinAncestorFromComponentProps = (
  props: Record<string, unknown>
) => {
  return props["data-ws-index"] as string | undefined;
};
