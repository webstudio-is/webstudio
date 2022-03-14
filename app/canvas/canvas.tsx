import { useCallback, useMemo, useState } from "react";
import { DndProvider } from "react-dnd";
import { TouchBackend } from "react-dnd-touch-backend";
import { type ChildrenUpdates } from "@webstudio-is/sdk";
import { type Instance, useAllUserProps } from "@webstudio-is/sdk";
import { publish, useSubscribe } from "./pubsub";
import { createElementsTree, setInstanceChildren } from "~/shared/tree-utils";
import { type Data, globalStyles, Root as CanvasRoot } from "@webstudio-is/sdk";
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
  const onChangeChildren = useCallback(
    (change) => {
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
    },
    [rootInstance]
  );

  return useMemo(
    () =>
      createElementsTree({
        instance: rootInstance,
        Component,
        onChangeChildren,
      }),
    [rootInstance]
  );
};

const useIsPreviewMode = () => {
  const [isPreviewMode, setIsPreviewMode] = useState<boolean>(false);
  useSubscribe<"togglePreviewMode", boolean>(
    "togglePreviewMode",
    setIsPreviewMode
  );
  return isPreviewMode;
};

export const Canvas = ({ data }: { data: Data }): JSX.Element => {
  globalStyles();
  const [allUserProps] = useAllUserProps(data.props);
  const [rootInstance, setRootInstance] = usePopulateRootInstance(data.tree);
  const { instanceInsertionSpec, instanceReparentingSpec } =
    useDragDropHandlers({ rootInstance });
  useUpdateInstanceStyle({ rootInstance, setRootInstance });
  usePublishSelectedInstance({ treeId: data.tree.id });
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

  // @todo no need to run any of this hooks in preview mode, need to find a better way to switch to preview
  const isPreviewMode = useIsPreviewMode();

  const elements = useElementsTree(
    rootInstance,
    WrapperComponentDev,
    setRootInstance
  );

  const props = useMemo(() => Object.values(allUserProps), [allUserProps]);

  if (isPreviewMode) {
    return (
      <CanvasRoot
        data={{
          tree: { id: data.tree.id, root: rootInstance },
          props,
        }}
      />
    );
  }

  return (
    // Using touch backend becuase html5 drag&drop doesn't fire drag events in our case
    <DndProvider backend={TouchBackend} options={{ enableMouseEvents: true }}>
      {elements}
    </DndProvider>
  );
};
