import { useState, useMemo, useCallback } from "react";
import { type Instance } from "@webstudio-is/react-sdk";
import { getInstancePath } from "~/shared/tree-utils";
import { TreeNode, getIsExpandable } from "./tree-node";

export const useExpandState = ({
  selectedInstanceId,
  root,
}: {
  root: Instance;
  selectedInstanceId?: Instance["id"];
}) => {
  const [record, setRecord] = useState<Record<Instance["id"], boolean>>({});

  const selectedInstancePath = useMemo(
    () =>
      selectedInstanceId !== undefined
        ? getInstancePath(root, selectedInstanceId).map(
            (instance) => instance.id
          )
        : [],
    [root, selectedInstanceId]
  );

  const getIsExpanded = useCallback(
    (instance: Instance) =>
      getIsExpandable(instance) &&
      (record[instance.id] === true ||
        selectedInstancePath.includes(instance.id)),
    [record, selectedInstancePath]
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

export const Tree = ({ root, selectedInstanceId, ...rest }: TreeProps) => {
  const expandState = useExpandState({ root, selectedInstanceId });
  return (
    <TreeNode
      level={0}
      instance={root}
      selectedInstanceId={selectedInstanceId}
      {...rest}
      {...expandState}
    />
  );
};
