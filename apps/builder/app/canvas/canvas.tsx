import { useMemo, Fragment, useEffect } from "react";
import { useStore } from "@nanostores/react";
import { computed } from "nanostores";
import type { Params } from "@webstudio-is/react-sdk";
import type { Instance, Page } from "@webstudio-is/project-build";
import {
  createElementsTree,
  registerComponents,
  registerComponentPropsMetas,
  registerComponentMetas,
  customComponentMetas,
  customComponentPropsMetas,
  setParams,
  customComponents,
  type GetComponent,
} from "@webstudio-is/react-sdk";
import { publish } from "~/shared/pubsub";
import { registerContainers, useCanvasStore } from "~/shared/sync";
import { useSharedShortcuts } from "~/shared/shortcuts";
import { useShortcuts } from "./shared/use-shortcuts";
import { useManageDesignModeStyles, GlobalStyles } from "./shared/styles";
import { WebstudioComponentDev } from "./features/webstudio-component";
import {
  propsIndexStore,
  assetsStore,
  pagesStore,
  useRootInstance,
  instancesStore,
  useIsPreviewMode,
  selectedPageStore,
} from "~/shared/nano-states";
import { useDragAndDrop } from "./shared/use-drag-drop";
import { useSubscribeBuilderReady } from "./shared/use-builder-ready";
import { useCopyPaste } from "~/shared/copy-paste";
import { setDataCollapsed, subscribeCollapsedToPubSub } from "./collapsed";
import { useWindowResizeDebounced } from "~/shared/dom-hooks";
import { subscribeInstanceSelection } from "./instance-selection";
import { subscribeInstanceHovering } from "./instance-hovering";

registerContainers();

const propsByInstanceIdStore = computed(
  propsIndexStore,
  (propsIndex) => propsIndex.propsByInstanceId
);

const temporaryRootInstance: Instance = {
  type: "instance",
  id: "temporaryRootInstance",
  component: "Body",
  children: [],
};

const useElementsTree = (getComponent: GetComponent) => {
  const [rootInstance] = useRootInstance();

  // @todo remove after https://github.com/webstudio-is/webstudio-builder/issues/1313 now its needed to be sure that no leaks exists
  // eslint-disable-next-line no-console
  console.log({
    rootInstance,
    assetsStore: assetsStore.get().size,
    pagesStore: pagesStore.get()?.pages.length ?? 0,
    instancesStore: instancesStore.get().size,
  });

  const pagesMapStore = useMemo(
    () =>
      computed(pagesStore, (pages): Map<string, Page> => {
        if (pages === undefined) {
          return new Map();
        }
        return new Map(
          [pages.homePage, ...pages.pages].map((page) => [page.id, page])
        );
      }),
    []
  );

  return useMemo(() => {
    return createElementsTree({
      sandbox: true,
      // fallback to temporary root instance to render scripts
      // and receive real data from builder
      instance: rootInstance ?? temporaryRootInstance,
      propsByInstanceIdStore,
      assetsStore,
      pagesStore: pagesMapStore,
      Component: WebstudioComponentDev,
      getComponent,
    });
  }, [rootInstance, getComponent, pagesMapStore]);
};

const DesignMode = () => {
  useManageDesignModeStyles();
  useDragAndDrop();
  // We need to initialize this in both canvas and builder,
  // because the events will fire in either one, depending on where the focus is
  // @todo we need to forward the events from canvas to builder and avoid importing this
  // in both places
  useCopyPaste();

  useEffect(subscribeInstanceSelection, []);
  useEffect(subscribeInstanceHovering, []);

  return null;
};

type CanvasProps = {
  params: Params;
  getComponent: GetComponent;
};

export const Canvas = ({
  params,
  getComponent,
}: CanvasProps): JSX.Element | null => {
  const isBuilderReady = useSubscribeBuilderReady();
  setParams(params ?? null);
  useCanvasStore(publish);
  const [isPreviewMode] = useIsPreviewMode();

  registerComponents(customComponents);
  registerComponentMetas(customComponentMetas);
  registerComponentPropsMetas(customComponentPropsMetas);

  // e.g. toggling preview is still needed in both modes
  useShortcuts();
  useSharedShortcuts();
  const selectedPage = useStore(selectedPageStore);

  useEffect(() => {
    const rootInstanceId = selectedPage?.rootInstanceId;
    if (rootInstanceId !== undefined) {
      setDataCollapsed(rootInstanceId);
    }
  });

  useWindowResizeDebounced(() => {
    const rootInstanceId = selectedPage?.rootInstanceId;
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
