export * from "./context";
export * from "./hook";
export * from "./variable-state";

export const getIndexWithinAncestorFromComponentProps = (
  props: Record<string, unknown>
) => {
  return props["data-ws-index"] as string | undefined;
};
