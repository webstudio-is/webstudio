export * from "./resource-loader";
export * from "./to-string";
export * from "./form-fields";
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
