import { BaseTree, TreeProps, useExpandState } from "./base-tree";

export const Tree = (props: TreeProps) => {
  const expandState = useExpandState();
  return <BaseTree {...props} {...expandState} />;
};
