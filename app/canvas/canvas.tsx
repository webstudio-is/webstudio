import { useMemo, useState } from "react";
import { DndProvider } from "react-dnd";
import { TouchBackend } from "react-dnd-touch-backend";
import {
  type Instance,
  type ChildrenUpdates,
  type OnChangeChildren,
  type Data,
  type Tree,
  useAllUserProps,
  WrapperComponent,
  globalStyles,
} from "@webstudio-is/sdk";
import { publish, useSubscribe } from "./pubsub";
import { createElementsTree, setInstanceChildren } from "~/shared/tree-utils";
import {
  useDragDropHandlers,
  useShortcuts,
  usePopulateRootInstance,
  useUpdateInstanceStyle,
  usePublishSelectedInstance,
  useInsertInstance,
  useDeleteInstance,
  usePublishRootInstance,
  useActiveElementTracking,
  useReparentInstance,
} from "./hooks";
import { WrapperComponentDev } from "./wrapper-component";

const useElementsTree = (
  rootInstance: Instance,
  Component: typeof WrapperComponentDev,
  setRootInstance: (instance: Instance) => void
) => {
  return useMemo(() => {
    const onChangeChildren: OnChangeChildren = (change) => {
      const { instanceId, updates } = change;
      const updatedRoot = setInstanceChildren(
        instanceId,
        updates,
        rootInstance
      );
      setRootInstance(updatedRoot);
      publish<
        "syncInstanceChildrenChange",
        { instanceId: Instance["id"]; updates: ChildrenUpdates }
      >({
        type: "syncInstanceChildrenChange",
        payload: change,
      });
    };
    return createElementsTree({
      instance: rootInstance,
      Component,
      onChangeChildren,
    });
  }, [rootInstance, Component]);
};

const useIsPreviewMode = () => {
  const [isPreviewMode, setIsPreviewMode] = useState<boolean>(false);
  useSubscribe<"togglePreviewMode", boolean>(
    "togglePreviewMode",
    setIsPreviewMode
  );
  return isPreviewMode;
};

const PreviewMode = ({ rootInstance }: { rootInstance: Instance }) => {
  return createElementsTree({
    instance: rootInstance,
    Component: WrapperComponent,
  });
};

type DesignModeProps = {
  rootInstance: Instance;
  treeId: Tree["id"];
  setRootInstance: (instance: Instance) => void;
};

const DesignMode = ({
  rootInstance,
  treeId,
  setRootInstance,
}: DesignModeProps) => {
  const { instanceInsertionSpec, instanceReparentingSpec } =
    useDragDropHandlers({ rootInstance });
  useUpdateInstanceStyle({ rootInstance, setRootInstance });
  usePublishSelectedInstance({ treeId });
  useInsertInstance({ rootInstance, setRootInstance, instanceInsertionSpec });
  useReparentInstance({
    rootInstance,
    setRootInstance,
    instanceReparentingSpec,
  });
  useDeleteInstance({ rootInstance, setRootInstance });
  usePublishRootInstance(rootInstance);
  useActiveElementTracking({ rootInstance });
  useShortcuts({ rootInstance });

  const elements = useElementsTree(
    rootInstance,
    WrapperComponentDev,
    setRootInstance
  );
  return (
    // Using touch backend becuase html5 drag&drop doesn't fire drag events in our case
    <DndProvider backend={TouchBackend} options={{ enableMouseEvents: true }}>
      {elements}
    </DndProvider>
  );
};

export const Canvas = ({ data }: { data: Data }): JSX.Element => {
  globalStyles();
  useAllUserProps(data.props);
  const [rootInstance, setRootInstance] = usePopulateRootInstance(data.tree);
  const isPreviewMode = useIsPreviewMode();

  if (isPreviewMode) {
    return <PreviewMode rootInstance={rootInstance} />;
  }

  return (
    <DesignMode
      rootInstance={rootInstance}
      setRootInstance={setRootInstance}
      treeId={data.tree.id}
    />
  );
};
