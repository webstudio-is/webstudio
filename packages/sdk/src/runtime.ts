export * from "./resource-loader";
export * from "./to-string";
export * from "./form-fields";

export const tagProperty = "data-ws-tag";

export const getTagFromComponentProps = (
  props: Record<string, unknown>
): string | undefined => {
  return props[tagProperty] as string | undefined;
};
