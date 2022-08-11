import { BaseTree, TreeProps, useExpandState } from "./base-tree";

export const Tree = (props: TreeProps) => {
  const expandState = useExpandState(props);
  return <BaseTree {...props} {...expandState} />;
};
