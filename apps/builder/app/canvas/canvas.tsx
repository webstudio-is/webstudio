import { useMemo } from "react";
import { computed } from "nanostores";
import type { CanvasData } from "@webstudio-is/project";
import {
  createElementsTree,
  registerComponents,
  registerComponentPropsMetas,
  registerComponentMetas,
  customComponentMetas,
  customComponentPropsMetas,
  setParams,
} from "@webstudio-is/react-sdk";
import { publish } from "~/shared/pubsub";
import { registerContainers, useCanvasStore } from "~/shared/sync";
import { useSharedShortcuts } from "~/shared/shortcuts";
import { useShortcuts } from "./shared/use-shortcuts";
import { usePublishTextEditingInstanceId } from "./shared/instance";
import { useManageDesignModeStyles, GlobalStyles } from "./shared/styles";
import { useTrackSelectedElement } from "./shared/use-track-selected-element";
import { WrapperComponentDev } from "./features/wrapper-component";
import {
  propsIndexStore,
  assetsStore,
  useRootInstance,
  useSetBreakpoints,
  useSetProps,
  useSetRootInstance,
  useSetStyles,
  useSetStyleSources,
  useSetStyleSourceSelections,
  useSubscribeScrollState,
  useIsPreviewMode,
  useSetAssets,
  useSetTreeId,
} from "~/shared/nano-states";
import { usePublishScrollState } from "./shared/use-publish-scroll-state";
import { useDragAndDrop } from "./shared/use-drag-drop";
import { useSubscribeBuilderReady } from "./shared/use-builder-ready";
import { useCopyPaste } from "~/shared/copy-paste";
import { customComponents } from "./custom-components";
import { useHoveredInstanceConnector } from "./hovered-instance-connector";

registerContainers();

const propsByInstanceIdStore = computed(
  propsIndexStore,
  (propsIndex) => propsIndex.propsByInstanceId
);

const useElementsTree = () => {
  const [rootInstance] = useRootInstance();

  return useMemo(() => {
    if (rootInstance === undefined) {
      return;
    }

    return createElementsTree({
      sandbox: true,
      instance: rootInstance,
      propsByInstanceIdStore,
      assetsStore,
      Component: WrapperComponentDev,
    });
  }, [rootInstance]);
};

const DesignMode = () => {
  useManageDesignModeStyles();
  useTrackSelectedElement();
  usePublishScrollState();
  useSubscribeScrollState();
  usePublishTextEditingInstanceId();
  useDragAndDrop();
  // We need to initialize this in both canvas and builder,
  // because the events will fire in either one, depending on where the focus is
  // @todo we need to forward the events from canvas to builder and avoid importing this
  // in both places
  useCopyPaste();
  useHoveredInstanceConnector();

  return null;
};

type CanvasProps = {
  data: CanvasData;
};

export const Canvas = ({ data }: CanvasProps): JSX.Element | null => {
  if (data.build === null) {
    throw new Error("Build is null");
  }
  if (data.tree === null) {
    throw new Error("Tree is null");
  }
  const isBuilderReady = useSubscribeBuilderReady();
  useSetTreeId(data.tree.id);
  useSetAssets(data.assets);
  useSetBreakpoints(data.build.breakpoints);
  useSetProps(data.tree.props);
  useSetStyles(data.build.styles);
  useSetStyleSources(data.build.styleSources);
  useSetStyleSourceSelections(data.tree.styleSourceSelections);
  useSetRootInstance(data.tree.root);
  setParams(data.params ?? null);
  useCanvasStore(publish);
  const [isPreviewMode] = useIsPreviewMode();

  registerComponents(customComponents);
  registerComponentMetas(customComponentMetas);
  registerComponentPropsMetas(customComponentPropsMetas);

  // e.g. toggling preview is still needed in both modes
  useShortcuts();
  useSharedShortcuts();

  const elements = useElementsTree();

  if (elements === undefined) {
    return null;
  }

  if (isPreviewMode || isBuilderReady === false) {
    return (
      <>
        <GlobalStyles />
        {elements}
      </>
    );
  }

  return (
    <>
      <GlobalStyles />
      <DesignMode />
      {elements}
    </>
  );
};
