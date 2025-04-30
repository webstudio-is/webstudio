export * from "./resource-loader";
export * from "./to-string";
export * from "./form-fields";

export const tagProperty = "data-ws-tag";

export const getTagFromProps = (
  props: Record<string, unknown>
): string | undefined => {
  return props[tagProperty] as string | undefined;
};

export const indexProperty = "data-ws-index";

export const getIndexWithinAncestorFromProps = (
  props: Record<string, unknown>
) => {
  return props[indexProperty] as string | undefined;
};

export const animationCanPlayOnCanvasProperty =
  "data-ws-animation-can-play-on-canvas";
