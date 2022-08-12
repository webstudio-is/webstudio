import { useState, useMemo, useCallback } from "react";
import { type Instance } from "@webstudio-is/react-sdk";
import { getInstancePath } from "~/shared/tree-utils";
import { TreeNode, getIsExpandable } from "./tree-node";
import noop from "lodash.noop";

export const useExpandState = ({
  selectedInstanceId,
  root,
  onSelect = noop,
}: {
  root: Instance;
  selectedInstanceId?: Instance["id"];
  onSelect?: (instance: Instance) => void;
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
    (instance: Instance) => {
      const isParentOfSelectedInstance =
        selectedInstancePath.includes(instance.id) &&
        selectedInstanceId !== instance.id;

      return (
        getIsExpandable(instance) &&
        (record[instance.id] === true || isParentOfSelectedInstance)
      );
    },
    [record, selectedInstanceId, selectedInstancePath]
  );

  const setIsExpanded = useCallback(
    (instance: Instance, expanded: boolean) => {
      setRecord((record) => ({ ...record, [instance.id]: expanded }));

      // To allow user to collapse a parent of a selected instance
      // We need to change the selected instance to the parent
      if (expanded === false) {
        const isParentOfSelectedInstance =
          selectedInstancePath.includes(instance.id) &&
          selectedInstanceId !== instance.id;
        if (isParentOfSelectedInstance) {
          onSelect(instance);
        }
      }
    },
    [onSelect, selectedInstanceId, selectedInstancePath]
  );

  return { getIsExpanded, setIsExpanded };
};

export type TreeProps = {
  root: Instance;
  selectedInstanceId?: Instance["id"];
  onSelect?: (instance: Instance) => void;
  animate?: boolean;
};

export const Tree = ({
  root,
  selectedInstanceId,
  onSelect,
  ...rest
}: TreeProps) => {
  const expandState = useExpandState({ root, selectedInstanceId, onSelect });
  return (
    <TreeNode
      level={0}
      instance={root}
      selectedInstanceId={selectedInstanceId}
      onSelect={onSelect}
      {...rest}
      {...expandState}
    />
  );
};
