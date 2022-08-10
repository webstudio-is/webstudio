import { useState, useMemo, forwardRef, useCallback } from "react";
import { type Instance } from "@webstudio-is/react-sdk";
import { getInstancePath } from "~/shared/tree-utils";
import { TreeNode, getIsExpandable } from "./tree-node";

type ExpandState = {
  getIsExpanded: (instance: Instance) => boolean;
  setIsExpanded: (instanceId: Instance["id"], expanded: boolean) => void;
};

export const useExpandState = (): ExpandState => {
  const [record, setRecord] = useState<Record<Instance["id"], boolean>>({});

  const getIsExpanded = useCallback(
    (instance: Instance) =>
      getIsExpandable(instance) && record[instance.id] === true,
    [record]
  );

  const setIsExpanded = useCallback(
    (instanceId: Instance["id"], expanded: boolean) => {
      setRecord((record) => ({ ...record, [instanceId]: expanded }));
    },
    []
  );

  return { getIsExpanded, setIsExpanded };
};

export type TreeProps = {
  root: Instance;
  selectedInstanceId?: Instance["id"];
  onSelect?: (instance: Instance) => void;
  animate?: boolean;
};

type BaseTreeProps = TreeProps & {
  getIsExpanded: (instance: Instance) => boolean;
  setIsExpanded: (instanceId: Instance["id"], expanded: boolean) => void;
  onAnimationEnd?: () => void;
};

export const BaseTree = forwardRef<HTMLDivElement, BaseTreeProps>(
  ({ root, selectedInstanceId, ...rest }, ref) => {
    const selectedInstancePath = useMemo(
      () =>
        selectedInstanceId !== undefined
          ? getInstancePath(root, selectedInstanceId)
          : [],
      [root, selectedInstanceId]
    );

    return (
      <TreeNode
        ref={ref}
        instance={root}
        level={0}
        selectedInstanceId={selectedInstanceId}
        selectedInstancePath={selectedInstancePath}
        {...rest}
      />
    );
  }
);
BaseTree.displayName = "BaseTree";

export const Tree = (props: TreeProps) => {
  const expandState = useExpandState();
  return <BaseTree {...props} {...expandState} />;
};
