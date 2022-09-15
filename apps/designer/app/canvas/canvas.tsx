import { useCallback, useMemo, useState } from "react";
import store from "immerhin";
import type { Build } from "@webstudio-is/project";
import {
  createElementsTree,
  globalStyles,
  type OnChangeChildren,
  type Tree,
  useAllUserProps,
} from "@webstudio-is/react-sdk";
import { useSubscribe } from "~/shared/pubsub";
import { useShortcuts } from "./shared/use-shortcuts";
import {
  useDeleteInstance,
  useInsertInstance,
  usePopulateRootInstance,
  usePublishHoveredInstanceData,
  usePublishHoveredInstanceRect,
  usePublishRootInstance,
  usePublishSelectedInstanceData,
  usePublishSelectedInstanceDataRect,
  usePublishTextEditingInstanceId,
  useReparentInstance,
  useSetHoveredInstance,
  useUnselectInstance,
  useUpdateSelectedInstance,
} from "./shared/instance";
import { useUpdateStyle } from "./shared/style";
import { useTrackSelectedElement } from "./shared/use-track-selected-element";
import { WrapperComponentDev } from "./features/wrapper-component";
import { useSync } from "./shared/sync";
import { useManageProps } from "./shared/props";
import {
  useHandleBreakpoints,
  useInitializeBreakpoints,
} from "./shared/breakpoints";
import {
  rootInstanceContainer,
  useBreakpoints,
  useRootInstance,
  useSubscribeScrollState,
} from "~/shared/nano-states";
import { registerContainers } from "./shared/immerhin";
import { useTrackHoveredElement } from "./shared/use-track-hovered-element";
import { usePublishScrollState } from "./shared/use-publish-scroll-state";
import { useDragAndDrop } from "./shared/use-drag-drop";
import { setInstanceChildrenMutable } from "~/shared/tree-utils";
import { CanvasData } from "~/shared/db";

registerContainers();

const useElementsTree = () => {
  const [rootInstance] = useRootInstance();
  const [breakpoints] = useBreakpoints();

  const onChangeChildren: OnChangeChildren = useCallback((change) => {
    store.createTransaction([rootInstanceContainer], (rootInstance) => {
      if (rootInstance === undefined) return;

      const { instanceId, updates } = change;
      setInstanceChildrenMutable(instanceId, updates, rootInstance);
    });
  }, []);

  return useMemo(() => {
    if (rootInstance === undefined) return;

    return createElementsTree({
      instance: rootInstance,
      breakpoints,
      Component: WrapperComponentDev,
      onChangeChildren,
    });
  }, [rootInstance, breakpoints, onChangeChildren]);
};

const useSubscribePreviewMode = () => {
  const [isPreviewMode, setIsPreviewMode] = useState<boolean>(false);
  useSubscribe("previewMode", setIsPreviewMode);
  return isPreviewMode;
};

type DesignModeProps = {
  treeId: Tree["id"];
  buildId: Build["id"];
};

const DesignMode = ({ treeId, buildId }: DesignModeProps) => {
  useUpdateStyle();
  useManageProps();
  usePublishSelectedInstanceData(treeId);
  usePublishHoveredInstanceData();
  useHandleBreakpoints();
  useInsertInstance();
  useReparentInstance();
  useDeleteInstance();
  usePublishRootInstance();
  useTrackSelectedElement();
  useTrackHoveredElement();
  useSetHoveredInstance();
  useSync({ buildId, treeId });
  useUpdateSelectedInstance();
  usePublishSelectedInstanceDataRect();
  usePublishHoveredInstanceRect();
  useUnselectInstance();
  usePublishScrollState();
  useSubscribeScrollState();
  usePublishTextEditingInstanceId();
  useDragAndDrop();
  return null;
};

type CanvasProps = {
  data: CanvasData;
};

export const Canvas = ({ data }: CanvasProps): JSX.Element | null => {
  if (data.tree === null) {
    throw new Error("Tree is null");
  }
  useInitializeBreakpoints(data.breakpoints);
  globalStyles();
  useAllUserProps(data.props);
  usePopulateRootInstance(data.tree);
  // e.g. toggling preview is still needed in both modes
  useShortcuts();
  const isPreviewMode = useSubscribePreviewMode();
  const elements = useElementsTree();

  if (elements === undefined) return null;

  if (isPreviewMode) {
    return elements;
  }

  return (
    <>
      <DesignMode treeId={data.tree.id} buildId={data.buildId} />
      {elements}
    </>
  );
};
