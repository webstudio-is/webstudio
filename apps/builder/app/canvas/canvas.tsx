import { useMemo, Fragment, useEffect } from "react";
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
  type GetComponent,
} from "@webstudio-is/react-sdk";
import { publish } from "~/shared/pubsub";
import { registerContainers, useCanvasStore } from "~/shared/sync";
import { useSharedShortcuts } from "~/shared/shortcuts";
import { useShortcuts } from "./shared/use-shortcuts";
import { usePublishTextEditingInstanceId } from "./shared/instance";
import { useManageDesignModeStyles, GlobalStyles } from "./shared/styles";
import { useTrackSelectedElement } from "./shared/use-track-selected-element";
import { WebstudioComponentDev } from "./features/webstudio-component";
import {
  propsIndexStore,
  assetsStore,
  useRootInstance,
  useSetBreakpoints,
  useSetInstances,
  useSetProps,
  useSetStyles,
  useSetStyleSources,
  useSetStyleSourceSelections,
  useSubscribeScrollState,
  useIsPreviewMode,
  useSetAssets,
  useSetSelectedPage,
} from "~/shared/nano-states";
import { usePublishScrollState } from "./shared/use-publish-scroll-state";
import { useDragAndDrop } from "./shared/use-drag-drop";
import { useSubscribeBuilderReady } from "./shared/use-builder-ready";
import { useCopyPaste } from "~/shared/copy-paste";
import { customComponents } from "./custom-components";
import { useHoveredInstanceConnector } from "./hovered-instance-connector";
import { setDataCollapsed, subscribeCollapsedToPubSub } from "./collapsed";

registerContainers();

const propsByInstanceIdStore = computed(
  propsIndexStore,
  (propsIndex) => propsIndex.propsByInstanceId
);

const useElementsTree = (getComponent: GetComponent) => {
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
      Component: WebstudioComponentDev,
      getComponent,
    });
  }, [rootInstance, getComponent]);
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
  getComponent: GetComponent;
};

export const Canvas = ({
  data,
  getComponent,
}: CanvasProps): JSX.Element | null => {
  if (data.build === null) {
    throw new Error("Build is null");
  }
  if (data.tree === null) {
    throw new Error("Tree is null");
  }
  const isBuilderReady = useSubscribeBuilderReady();
  useSetAssets(data.assets);
  useSetBreakpoints(data.build.breakpoints);
  useSetProps(data.build.props);
  useSetStyles(data.build.styles);
  useSetStyleSources(data.build.styleSources);
  useSetStyleSourceSelections(data.build.styleSourceSelections);
  useSetInstances(data.build.instances);
  useSetSelectedPage(data.page);
  setParams(data.params ?? null);
  useCanvasStore(publish);
  const [isPreviewMode] = useIsPreviewMode();

  registerComponents(customComponents);
  registerComponentMetas(customComponentMetas);
  registerComponentPropsMetas(customComponentPropsMetas);

  // e.g. toggling preview is still needed in both modes
  useShortcuts();
  useSharedShortcuts();

  useEffect(() => {
    const rootInstanceId = data.page.rootInstanceId;
    if (rootInstanceId !== undefined) {
      setDataCollapsed(rootInstanceId);
    }
  });

  useEffect(subscribeCollapsedToPubSub, []);

  const elements = useElementsTree(getComponent);

  if (elements === undefined) {
    return null;
  }

  if (isPreviewMode || isBuilderReady === false) {
    return (
      <>
        <GlobalStyles />
        {/* Without fragment elements will be recreated in DesignMode */}
        <Fragment key="elements">{elements}</Fragment>
      </>
    );
  }

  return (
    <>
      <GlobalStyles />
      <DesignMode />
      <Fragment key="elements">{elements}</Fragment>
    </>
  );
};
