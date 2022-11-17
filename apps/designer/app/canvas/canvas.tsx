import { useCallback, useMemo, useState } from "react";
import store from "immerhin";
import type { Build } from "@webstudio-is/project";
import {
  createElementsTree,
  useAllUserProps,
  type OnChangeChildren,
  type Tree,
} from "@webstudio-is/react-sdk";
import { useSubscribe } from "~/shared/pubsub";
import { useShortcuts } from "./shared/use-shortcuts";
import {
  useDeleteInstance,
  useInsertInstance,
  usePopulateRootInstance,
  usePublishRootInstance,
  usePublishSelectedInstanceData,
  usePublishSelectedInstanceDataRect,
  usePublishTextEditingInstanceId,
  useReparentInstance,
  useSetHoveredInstance,
  usePublishHoveredInstanceData,
  useUnselectInstance,
  useUpdateSelectedInstance,
} from "./shared/instance";
import { useManageDesignModeStyles, GlobalStyles } from "./shared/styles";
import { useTrackSelectedElement } from "./shared/use-track-selected-element";
import { WrapperComponentDev } from "./features/wrapper-component";
import { useSync } from "./shared/sync";
import { useManageProps } from "./shared/props";
import {
  useManageBreakpoints,
  useInitializeBreakpoints,
} from "./shared/breakpoints";
import {
  rootInstanceContainer,
  useRootInstance,
  useSubscribeScrollState,
} from "~/shared/nano-states";
import { registerContainers } from "./shared/immerhin";
import { usePublishScrollState } from "./shared/use-publish-scroll-state";
import { useDragAndDrop } from "./shared/use-drag-drop";
import { setInstanceChildrenMutable } from "~/shared/tree-utils";
import { CanvasData } from "~/shared/db";
import { useSubscribeDesignerReady } from "./shared/use-designer-ready";
import type { Asset } from "@webstudio-is/asset-uploader";

registerContainers();

const useElementsTree = () => {
  const [rootInstance] = useRootInstance();

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
      sandbox: true,
      instance: rootInstance,
      Component: WrapperComponentDev,
      onChangeChildren,
    });
  }, [rootInstance, onChangeChildren]);
};

const useSubscribePreviewMode = () => {
  const [isPreviewMode, setIsPreviewMode] = useState<boolean>(false);
  useSubscribe("previewMode", setIsPreviewMode);
  return isPreviewMode;
};

const useAssets = (initialAssets: Array<Asset>) => {
  const [assets, setAssets] = useState(initialAssets);
  useSubscribe("updateAssets", setAssets);
  return assets;
};

type DesignModeProps = {
  treeId: Tree["id"];
  buildId: Build["id"];
};

const DesignMode = ({ treeId, buildId }: DesignModeProps) => {
  useManageBreakpoints();
  useManageDesignModeStyles();
  useManageProps();
  usePublishSelectedInstanceData(treeId);
  useInsertInstance();
  useReparentInstance();
  useDeleteInstance();
  usePublishRootInstance();
  useTrackSelectedElement();
  useSetHoveredInstance();
  usePublishHoveredInstanceData();
  useSync({ buildId, treeId });
  useUpdateSelectedInstance();
  usePublishSelectedInstanceDataRect();
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
  const isDesignerReady = useSubscribeDesignerReady();
  useInitializeBreakpoints(data.breakpoints);
  const assets = useAssets(data.assets);
  useAllUserProps(data.props);
  usePopulateRootInstance(data.tree);
  // e.g. toggling preview is still needed in both modes
  useShortcuts();
  const isPreviewMode = useSubscribePreviewMode();
  const elements = useElementsTree();

  if (elements === undefined) return null;

  if (isPreviewMode || isDesignerReady === false) {
    return (
      <>
        <GlobalStyles assets={assets} />
        {elements}
      </>
    );
  }

  return (
    <>
      <GlobalStyles assets={assets} />
      <DesignMode treeId={data.tree.id} buildId={data.buildId} />
      {elements}
    </>
  );
};
