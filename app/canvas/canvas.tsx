import { useMemo, useState } from "react";
import { DndProvider } from "react-dnd";
import { TouchBackend } from "react-dnd-touch-backend";
import {
  type OnChangeChildren,
  type Data,
  type Tree,
  useAllUserProps,
  WrapperComponent,
  globalStyles,
} from "@webstudio-is/sdk";
import { useSubscribe } from "./shared/pubsub";
import {
  createElementsTree,
  setInstanceChildrenMutable,
} from "~/shared/tree-utils";
import { useDragDropHandlers } from "./shared/use-drag-drop-handlers";
import { useShortcuts } from "./shared/use-shortcuts";
import {
  usePopulateRootInstance,
  useInsertInstance,
  useDeleteInstance,
  useReparentInstance,
} from "./shared/tree";
import { useUpdateStyle } from "./shared/style";
import {
  usePublishSelectedInstance,
  usePublishRootInstance,
} from "./shared/publish";
import { useActiveElementTracking } from "./shared/active-element";
import { WrapperComponentDev } from "./features/wrapper-component";
import { rootInstanceContainer, useRootInstance } from "./shared/nano-values";
import { usePeriodicSync } from "./shared/use-periodic-sync";
import { createTransaction } from "~/lib/sync-engine";

const useElementsTree = () => {
  const [rootInstance] = useRootInstance();

  return useMemo(() => {
    if (rootInstance === undefined) return;

    const onChangeChildren: OnChangeChildren = (change) => {
      createTransaction([rootInstanceContainer], (rootInstance) => {
        if (rootInstance === undefined) return;

        const { instanceId, updates } = change;
        setInstanceChildrenMutable(instanceId, updates, rootInstance);
      });
    };

    return createElementsTree({
      instance: rootInstance,
      Component: WrapperComponentDev,
      onChangeChildren,
    });
  }, [rootInstance]);
};

const useIsPreviewMode = () => {
  const [isPreviewMode, setIsPreviewMode] = useState<boolean>(false);
  useSubscribe<"togglePreviewMode", boolean>(
    "togglePreviewMode",
    setIsPreviewMode
  );
  return isPreviewMode;
};

const PreviewMode = () => {
  const [rootInstance] = useRootInstance();
  if (rootInstance === undefined) return null;
  return createElementsTree({
    instance: rootInstance,
    Component: WrapperComponent,
  });
};

type DesignModeProps = {
  treeId: Tree["id"];
};

const DesignMode = ({ treeId }: DesignModeProps) => {
  useDragDropHandlers();
  useUpdateStyle();
  usePublishSelectedInstance({ treeId });
  useInsertInstance();
  useReparentInstance();
  useDeleteInstance();
  usePublishRootInstance();
  useActiveElementTracking();
  useShortcuts();
  usePeriodicSync();
  const elements = useElementsTree();
  return (
    // Using touch backend becuase html5 drag&drop doesn't fire drag events in our case
    <DndProvider backend={TouchBackend} options={{ enableMouseEvents: true }}>
      {elements}
    </DndProvider>
  );
};

export const Canvas = ({ data }: { data: Data }): JSX.Element | null => {
  globalStyles();
  useAllUserProps(data.props);
  usePopulateRootInstance(data.tree);
  const isPreviewMode = useIsPreviewMode();

  if (isPreviewMode) {
    return <PreviewMode />;
  }

  return <DesignMode treeId={data.tree.id} />;
};
