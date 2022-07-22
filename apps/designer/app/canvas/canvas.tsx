import { useCallback, useMemo, useState } from "react";
import store from "immerhin";
import * as db from "~/shared/db";
import {
  type OnChangeChildren,
  type Data,
  type Tree,
  useAllUserProps,
  WrapperComponent,
  globalStyles,
  useSubscribe,
} from "@webstudio-is/react-sdk";
import {
  createElementsTree,
  setInstanceChildrenMutable,
} from "~/shared/tree-utils";
import { useShortcuts } from "./shared/use-shortcuts";
import {
  usePopulateRootInstance,
  useInsertInstance,
  useDeleteInstance,
  useReparentInstance,
  usePublishSelectedInstanceData,
  usePublishRootInstance,
  useUpdateSelectedInstance,
  usePublishSelectedInstanceDataRect,
  usePublishHoveredInstanceRect,
  usePublishHoveredInstanceData,
  useSetHoveredInstance,
  useUnselectInstance,
  usePublishTextEditingInstanceId,
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
import {
  LexicalComposer,
  config,
} from "~/canvas/features/wrapper-component/text-editor";

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
  useSubscribe<"previewMode", boolean>("previewMode", setIsPreviewMode);
  return isPreviewMode;
};

const PreviewMode = () => {
  const [rootInstance] = useRootInstance();
  const [breakpoints] = useBreakpoints();
  if (rootInstance === undefined) return null;
  return createElementsTree({
    breakpoints,
    instance: rootInstance,
    Component: WrapperComponent,
  });
};

type DesignModeProps = {
  treeId: Tree["id"];
  project: db.project.Project;
};

const DesignMode = ({ treeId, project }: DesignModeProps) => {
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
  useSync({ project });
  useUpdateSelectedInstance();
  usePublishSelectedInstanceDataRect();
  usePublishHoveredInstanceRect();
  useUnselectInstance();
  usePublishScrollState();
  useSubscribeScrollState();
  usePublishTextEditingInstanceId();
  const elements = useElementsTree();
  return (
    <>
      {elements && (
        <LexicalComposer initialConfig={config}>{elements}</LexicalComposer>
      )}
    </>
  );
};

type CanvasProps = {
  data: Data & { project: db.project.Project };
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

  if (isPreviewMode) {
    return <PreviewMode />;
  }

  return <DesignMode treeId={data.tree.id} project={data.project} />;
};
