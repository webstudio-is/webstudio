import { useCallback, useMemo, useState } from "react";
import { useStore } from "@nanostores/react";
import store from "immerhin";
import type { CanvasData } from "@webstudio-is/project";
import {
  createElementsTree,
  useAllUserProps,
  registerComponents,
  registerComponentsMeta,
  customComponentsMeta,
  setParams,
  type OnChangeChildren,
} from "@webstudio-is/react-sdk";
import { publish, useSubscribe } from "~/shared/pubsub";
import { registerContainers, useCanvasStore } from "~/shared/sync";
import { useShortcuts } from "./shared/use-shortcuts";
import {
  useDeleteInstance,
  useInsertInstance,
  usePublishTextEditingInstanceId,
  useReparentInstance,
} from "./shared/instance";
import { useManageDesignModeStyles, GlobalStyles } from "./shared/styles";
import { useTrackSelectedElement } from "./shared/use-track-selected-element";
import { WrapperComponentDev } from "./features/wrapper-component";
import {
  rootInstanceContainer,
  selectedInstanceStore,
  useBreakpoints,
  useInstanceProps,
  useRootInstance,
  useSetBreakpoints,
  useSetDesignTokens,
  useSetProps,
  useSetRootInstance,
  useSetStyles,
  useSubscribeScrollState,
} from "~/shared/nano-states";
import { usePublishScrollState } from "./shared/use-publish-scroll-state";
import { useDragAndDrop } from "./shared/use-drag-drop";
import { utils } from "@webstudio-is/project";
import { useSubscribeDesignerReady } from "./shared/use-designer-ready";
import type { Asset } from "@webstudio-is/asset-uploader";
import { useInstanceCopyPaste } from "~/shared/copy-paste";
import { customComponents } from "./custom-components";
import { useHoveredInstanceConnector } from "./hovered-instance-connector";

registerContainers();

const useElementsTree = () => {
  const [rootInstance] = useRootInstance();
  const [breakpoints] = useBreakpoints();

  const onChangeChildren: OnChangeChildren = useCallback(
    (change) => {
      store.createTransaction([rootInstanceContainer], (rootInstance) => {
        if (rootInstance === undefined) {
          return;
        }

        const { instanceId, updates } = change;
        utils.tree.setInstanceChildrenMutable(
          instanceId,
          updates,
          rootInstance,
          breakpoints[0].id
        );
      });
    },
    [breakpoints]
  );

  return useMemo(() => {
    if (rootInstance === undefined) {
      return;
    }

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

const useCopyPaste = () => {
  const selectedInstance = useStore(selectedInstanceStore);
  const instanceProps = useInstanceProps(selectedInstance?.id);

  const selectedInstanceData = useMemo(() => {
    if (selectedInstance) {
      return {
        instance: selectedInstance,
        props: instanceProps,
      };
    }
  }, [selectedInstance, instanceProps]);

  // We need to initialize this in both canvas and designer,
  // because the events will fire in either one, depending on where the focus is
  useInstanceCopyPaste({
    selectedInstanceData,
    allowAnyTarget: true,
    onCut: (instance) => {
      publish({ type: "deleteInstance", payload: { id: instance.id } });
    },
    onPaste: (instance, props) => {
      publish({
        type: "insertInstance",
        payload: { instance, props },
      });
    },
  });
};

const DesignMode = () => {
  useManageDesignModeStyles();
  useInsertInstance();
  useReparentInstance();
  useDeleteInstance();
  useTrackSelectedElement();
  usePublishScrollState();
  useSubscribeScrollState();
  usePublishTextEditingInstanceId();
  useDragAndDrop();
  useCopyPaste();

  useHoveredInstanceConnector();

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
  const assets = useAssets(data.assets);
  useSetBreakpoints(data.breakpoints);
  useSetDesignTokens(data.designTokens);
  useAllUserProps(data.props);
  useSetProps(data.tree.props);
  useSetStyles(data.tree.styles);
  useSetRootInstance(data.tree.root);
  setParams(data.params ?? null);
  useCanvasStore(publish);

  registerComponents(customComponents);

  registerComponentsMeta(customComponentsMeta);

  // e.g. toggling preview is still needed in both modes
  useShortcuts();
  const isPreviewMode = useSubscribePreviewMode();
  const elements = useElementsTree();

  if (elements === undefined) {
    return null;
  }

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
      <DesignMode />
      {elements}
    </>
  );
};
