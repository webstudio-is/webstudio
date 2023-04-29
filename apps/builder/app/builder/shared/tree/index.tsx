import { useCallback, useMemo } from "react";
import { useStore } from "@nanostores/react";
import {
  Tree,
  TreeItemLabel,
  TreeItemBody,
  type TreeProps,
  type TreeItemRenderProps,
} from "@webstudio-is/design-system";
import type { Instance } from "@webstudio-is/project-build";
import {
  canAcceptComponent,
  getComponentMeta,
  type WsComponentMeta,
} from "@webstudio-is/react-sdk";
import { instancesStore, useDragAndDropState } from "~/shared/nano-states";

const instanceRelatedProps = {
  renderItem(props: TreeItemRenderProps<Instance>) {
    const meta = getComponentMeta(props.itemData.component);
    if (meta === undefined) {
      return <></>;
    }
    return (
      <TreeItemBody {...props} selectionEvent="focus">
        <TreeItemLabel prefix={<meta.Icon />}>
          {getInstanceLabel(props.itemData, meta)}
        </TreeItemLabel>
      </TreeItemBody>
    );
  },
} as const;

export const InstanceTree = (
  props: Omit<
    TreeProps<Instance>,
    | keyof typeof instanceRelatedProps
    | "canLeaveParent"
    | "canAcceptChild"
    | "getItemChildren"
  >
) => {
  const instances = useStore(instancesStore);
  const [state] = useDragAndDropState();

  const dragPayload = state.dragPayload;

  const dragComponent = useMemo(() => {
    let dragComponent: undefined | string;
    if (dragPayload?.type === "insert") {
      dragComponent = dragPayload.dragComponent;
    }
    if (dragPayload?.type === "reparent") {
      dragComponent = instances.get(
        dragPayload.dragInstanceSelector[0]
      )?.component;
    }
    return dragComponent;
  }, [dragPayload, instances]);

  const canLeaveParent = useCallback(
    (instanceId: Instance["id"]) => {
      const instance = instances.get(instanceId);
      if (instance === undefined) {
        return false;
      }
      const meta = getComponentMeta(instance.component);
      return meta?.type !== "rich-text-child";
    },
    [instances]
  );

  const canAcceptChild = useCallback(
    (instanceId: Instance["id"]) => {
      const instance = instances.get(instanceId);
      if (instance === undefined || dragComponent === undefined) {
        return false;
      }
      return canAcceptComponent(instance.component, dragComponent);
    },
    [instances, dragComponent]
  );

  const getItemChildren = useCallback(
    (instanceId: Instance["id"]) => {
      const instance = instances.get(instanceId);
      const children: Instance[] = [];
      if (instance === undefined) {
        return children;
      }

      for (const child of instance.children) {
        if (child.type !== "id") {
          continue;
        }
        const childInstance = instances.get(child.value);
        if (childInstance === undefined) {
          continue;
        }
        children.push(childInstance);
      }
      return children;
    },
    [instances]
  );

  return (
    <Tree
      {...props}
      {...instanceRelatedProps}
      canLeaveParent={canLeaveParent}
      canAcceptChild={canAcceptChild}
      getItemChildren={getItemChildren}
    />
  );
};

export const getInstanceLabel = (
  instance: { label?: string },
  meta: WsComponentMeta
) => {
  return instance.label || meta.label;
};
