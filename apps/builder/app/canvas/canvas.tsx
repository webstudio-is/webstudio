import { useMemo, useEffect } from "react";
import { useStore } from "@nanostores/react";
import { computed } from "nanostores";
import type { DataSource, Instances, Page } from "@webstudio-is/project-build";
import {
  type Params,
  type Components,
  createElementsTree,
} from "@webstudio-is/react-sdk";
import * as baseComponents from "@webstudio-is/sdk-components-react";
import * as baseComponentMetas from "@webstudio-is/sdk-components-react/metas";
import * as baseComponentPropsMetas from "@webstudio-is/sdk-components-react/props";
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
  dataSourceValuesStore,
  dataSourcesStore,
} from "~/shared/nano-states";
import { useDragAndDrop } from "./shared/use-drag-drop";
import { useCopyPaste } from "~/shared/copy-paste";
import { useSyncInitializeOnce } from "~/shared/hook-utils";
import { setDataCollapsed, subscribeCollapsedToPubSub } from "./collapsed";
import { useWindowResizeDebounced } from "~/shared/dom-hooks";
import { subscribeInstanceSelection } from "./instance-selection";
import { subscribeInstanceHovering } from "./instance-hovering";
import { useHashLinkSync } from "~/shared/pages";

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

const useElementsTree = (components: Components, params: Params) => {
  const instances = useStore(instancesStore);
  const page = useStore(selectedPageStore);
  const [isPreviewMode] = useIsPreviewMode();
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
      renderer: isPreviewMode ? "preview" : "canvas",
      imageBaseUrl: params.imageBaseUrl,
      assetBaseUrl: params.assetBaseUrl,
      instances: instances.size === 0 ? temporaryInstances : instances,
      // fallback to temporary root instance to render scripts
      // and receive real data from builder
      rootInstanceId: rootInstanceId ?? temporaryRootInstanceId,
      propsByInstanceIdStore,
      assetsStore,
      pagesStore: pagesMapStore,
      dataSourceValuesStore: computed(
        [dataSourcesStore, dataSourceValuesStore],
        (dataSources, dataSourceValues) => {
          const newValues = new Map<DataSource["id"], unknown>();
          for (const [dataSourceId, dataSource] of dataSources) {
            newValues.set(dataSourceId, dataSource.value);
          }
          for (const [dataSourceId, dataSourceValue] of dataSourceValues) {
            newValues.set(dataSourceId, dataSourceValue);
          }
          return newValues;
        }
      ),
      onDataSourceUpdate: (dataSourceId, value) => {
        const dataSourceValues = new Map(dataSourceValuesStore.get());
        dataSourceValues.set(dataSourceId, value);
        dataSourceValuesStore.set(dataSourceValues);
      },
      Component: WebstudioComponentDev,
      components,
    });
  }, [
    params,
    instances,
    rootInstanceId,
    components,
    pagesMapStore,
    isPreviewMode,
  ]);
};

const DesignMode = ({ params }: { params: Params }) => {
  useManageDesignModeStyles(params);
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
  useCanvasStore(publish);
  const [isPreviewMode] = useIsPreviewMode();

  const components = new Map(
    Object.entries({ ...baseComponents, ...remixComponents })
  ) as Components;
  useSyncInitializeOnce(() => {
    registerComponentMetas(baseComponentMetas);
    registerComponentPropsMetas(baseComponentPropsMetas);
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

  useHashLinkSync();

  const elements = useElementsTree(components, params);

  return (
    <>
      <GlobalStyles params={params} />
      {isPreviewMode === false && handshaken === true && (
        <DesignMode params={params} />
      )}
      {elements}
    </>
  );
};
