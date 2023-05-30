import { useMemo, useEffect } from "react";
import { useStore } from "@nanostores/react";
import { computed } from "nanostores";
import type { Instances, Page } from "@webstudio-is/project-build";
import {
  type Params,
  type Components,
  defaultMetas,
  defaultPropsMetas,
  createElementsTree,
  setParams,
} from "@webstudio-is/react-sdk";
import * as defaultComponents from "@webstudio-is/react-sdk/components";
import * as remixComponents from "@webstudio-is/sdk-components-react-remix";
import * as remixComponentMetas from "@webstudio-is/sdk-components-react-remix/metas";
import * as remixComponentPropsMetas from "@webstudio-is/sdk-components-react-remix/props";
import { publish } from "~/shared/pubsub";
import {
  handshakenStore,
  registerContainers,
  useCanvasStore,
} from "~/shared/sync";
import { useSharedShortcuts } from "~/shared/shortcuts";
import { useCanvasShortcuts } from "./canvas-shortcuts";
import { useManageDesignModeStyles, GlobalStyles } from "./shared/styles";
import { WebstudioComponentDev } from "./features/webstudio-component";
import {
  propsIndexStore,
  assetsStore,
  pagesStore,
  instancesStore,
  useIsPreviewMode,
  selectedPageStore,
  registerComponentMetas,
  registerComponentPropsMetas,
} from "~/shared/nano-states";
import { useDragAndDrop } from "./shared/use-drag-drop";
import { useCopyPaste } from "~/shared/copy-paste";
import { useSyncInitializeOnce } from "~/shared/hook-utils";
import { setDataCollapsed, subscribeCollapsedToPubSub } from "./collapsed";
import { useWindowResizeDebounced } from "~/shared/dom-hooks";
import { subscribeInstanceSelection } from "./instance-selection";
import { subscribeInstanceHovering } from "./instance-hovering";

registerContainers();

const propsByInstanceIdStore = computed(
  propsIndexStore,
  (propsIndex) => propsIndex.propsByInstanceId
);

const temporaryRootInstanceId = "temporaryRootInstance";
const temporaryInstances: Instances = new Map([
  [
    temporaryRootInstanceId,
    {
      type: "instance",
      id: temporaryRootInstanceId,
      component: "Body",
      children: [],
    },
  ],
]);

const useElementsTree = (components: Components) => {
  const instances = useStore(instancesStore);
  const page = useStore(selectedPageStore);
  const rootInstanceId = page?.rootInstanceId;

  if (typeof window === "undefined") {
    // @todo remove after https://github.com/webstudio-is/webstudio-builder/issues/1313 now its needed to be sure that no leaks exists
    // eslint-disable-next-line no-console
    console.log({
      assetsStore: assetsStore.get().size,
      pagesStore: pagesStore.get()?.pages.length ?? 0,
      instancesStore: instancesStore.get().size,
    });
  }

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
      renderer: "canvas",
      instances: instances.size === 0 ? temporaryInstances : instances,
      // fallback to temporary root instance to render scripts
      // and receive real data from builder
      rootInstanceId: rootInstanceId ?? temporaryRootInstanceId,
      propsByInstanceIdStore,
      assetsStore,
      pagesStore: pagesMapStore,
      Component: WebstudioComponentDev,
      components,
    });
  }, [instances, rootInstanceId, components, pagesMapStore]);
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
};

export const Canvas = ({ params }: CanvasProps): JSX.Element | null => {
  const handshaken = useStore(handshakenStore);
  setParams(params ?? null);
  useCanvasStore(publish);
  const [isPreviewMode] = useIsPreviewMode();

  const components = new Map(
    Object.entries({ ...defaultComponents, ...remixComponents })
  ) as Components;
  useSyncInitializeOnce(() => {
    registerComponentMetas(defaultMetas);
    registerComponentPropsMetas(defaultPropsMetas);
    registerComponentMetas(remixComponentMetas);
    registerComponentPropsMetas(remixComponentPropsMetas);
  });

  // e.g. toggling preview is still needed in both modes
  useCanvasShortcuts();
  useSharedShortcuts({ source: "canvas" });
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

  const elements = useElementsTree(components);

  return (
    <>
      <GlobalStyles />
      {isPreviewMode === false && handshaken === true && <DesignMode />}
      {elements}
    </>
  );
};
