export * from "./resource-loader";
export {
  loadResourceWithEmail as loadResource,
  loadResourcesWithEmail as loadResources,
  loadResourceWithEmail,
  loadResourcesWithEmail,
} from "./email-resource-delivery";
export type {
  EmailResourceLoadOptions,
  EmailResourceGraphLoadOptions,
} from "./email-resource-delivery";
export * from "./system-search";
export * from "./email-addresses";
export * from "./email-resource";
export * from "./to-string";
export * from "./form-fields";
export * from "./managed-form-submission";
export * from "./managed-form-handler";
export * from "./managed-form-email";
export * from "./form-submission";
export * from "./json-ld";

export const tagProperty = "data-ws-tag";

export const getTagFromProps = (
  props: Record<string, unknown>
): string | undefined => {
  const tag = props[tagProperty];
  return typeof tag === "string" && tag.length > 0 ? tag : undefined;
};

export const indexProperty = "data-ws-index";

export const getIndexWithinAncestorFromProps = (
  props: Record<string, unknown>
) => {
  return props[indexProperty] as string | undefined;
};

export const animationCanPlayOnCanvasProperty =
  "data-ws-animation-can-play-on-canvas";
