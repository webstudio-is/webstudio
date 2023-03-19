import { useMemo } from "react";
import { atom, computed, type WritableAtom } from "nanostores";
import { useStore } from "@nanostores/react";
import { nanoid } from "nanoid";
import type { AuthPermit } from "@webstudio-is/trpc-interface";
import type { Asset } from "@webstudio-is/asset-uploader";
import type {
  Breakpoint,
  Breakpoints,
  Instance,
  Instances,
  InstancesItem,
  Page,
  Pages,
  Prop,
  Props,
  StyleDecl,
  StyleDeclKey,
  Styles,
  StyleSource,
  StyleSources,
  StyleSourceSelection,
  StyleSourceSelections,
} from "@webstudio-is/project-build";
import type { Style } from "@webstudio-is/css-data";
import type {
  DropTargetChangePayload,
  DragStartPayload,
} from "~/canvas/shared/use-drag-drop";
import type {
  AssetContainer,
  DeletingAssetContainer,
} from "~/builder/shared/assets";
import { useSyncInitializeOnce } from "../hook-utils";
import { shallowComputed } from "../store-utils";
import { createInstancesIndex, type InstanceSelector } from "../tree-utils";

const useValue = <T>(atom: WritableAtom<T>) => {
  const value = useStore(atom);
  return [value, atom.set] as const;
};

export const pagesStore = atom<undefined | Pages>(undefined);
export const useSetPages = (pages: Pages) => {
  useSyncInitializeOnce(() => {
    pagesStore.set(pages);
  });
};

export const selectedPageIdStore = atom<undefined | Page["id"]>(undefined);
export const useSetSelectedPageId = (pageId: Page["id"]) => {
  useSyncInitializeOnce(() => {
    selectedPageIdStore.set(pageId);
  });
};

export const selectedPageStore = computed(
  [pagesStore, selectedPageIdStore],
  (pages, selectedPageId) => {
    if (pages === undefined) {
      return undefined;
    }
    if (pages.homePage.id === selectedPageId) {
      return pages.homePage;
    }
    return pages.pages.find((page) => page.id === selectedPageId);
  }
);

export const instancesStore = atom<Map<InstancesItem["id"], InstancesItem>>(
  new Map()
);
export const useSetInstances = (
  instances: [InstancesItem["id"], InstancesItem][]
) => {
  useSyncInitializeOnce(() => {
    instancesStore.set(new Map(instances));
  });
};

export const rootInstanceStore = computed(
  [instancesStore, selectedPageStore],
  (instances, selectedPage) => {
    if (selectedPage === undefined) {
      return undefined;
    }
    return instances.get(selectedPage.rootInstanceId);
  }
);

// @todo will be removed soon
const denormalizeTree = (
  instances: Instances,
  rootInstanceId: Instance["id"]
): undefined | Instance => {
  const convertTree = (instance: InstancesItem) => {
    const legacyInstance: Instance = {
      type: "instance",
      id: instance.id,
      component: instance.component,
      label: instance.label,
      children: [],
    };
    for (const child of instance.children) {
      if (child.type === "id") {
        const childInstance = instances.get(child.value);
        if (childInstance) {
          legacyInstance.children.push(convertTree(childInstance));
        }
      } else {
        legacyInstance.children.push(child);
      }
    }
    return legacyInstance;
  };
  const rootInstance = instances.get(rootInstanceId);
  if (rootInstance === undefined) {
    return;
  }
  return convertTree(rootInstance);
};

export const rootInstanceContainer = computed(
  [instancesStore, selectedPageStore],
  (instances, selectedPage) => {
    if (selectedPage === undefined) {
      return undefined;
    }
    return denormalizeTree(instances, selectedPage.rootInstanceId);
  }
);
export const useRootInstance = () => {
  const value = useStore(rootInstanceContainer);
  return [value] as const;
};
export const instancesIndexStore = computed(
  rootInstanceContainer,
  createInstancesIndex
);

export const propsStore = atom<Props>(new Map());
export const propsIndexStore = computed(propsStore, (props) => {
  const propsByInstanceId = new Map<Instance["id"], Prop[]>();
  for (const prop of props.values()) {
    const { instanceId } = prop;
    let instanceProps = propsByInstanceId.get(instanceId);
    if (instanceProps === undefined) {
      instanceProps = [];
      propsByInstanceId.set(instanceId, instanceProps);
    }
    instanceProps.push(prop);
  }
  return {
    propsByInstanceId,
  };
});
export const useSetProps = (props: [Prop["id"], Prop][]) => {
  useSyncInitializeOnce(() => {
    propsStore.set(new Map(props));
  });
};
export const useInstanceProps = (instanceId: undefined | Instance["id"]) => {
  const instancePropsStore = useMemo(() => {
    return shallowComputed([propsIndexStore], (propsIndex) => {
      if (instanceId === undefined) {
        return [];
      }
      return propsIndex.propsByInstanceId.get(instanceId) ?? [];
    });
  }, [instanceId]);
  const instanceProps = useStore(instancePropsStore);
  return instanceProps;
};

export const stylesStore = atom<Styles>(new Map());

export const useSetStyles = (styles: [StyleDeclKey, StyleDecl][]) => {
  useSyncInitializeOnce(() => {
    stylesStore.set(new Map(styles));
  });
};
export const useInstanceStyles = (instanceId: undefined | Instance["id"]) => {
  const instanceStylesStore = useMemo(() => {
    return shallowComputed([stylesIndexStore], (stylesIndex) => {
      if (instanceId === undefined) {
        return [];
      }
      return stylesIndex.stylesByInstanceId.get(instanceId) ?? [];
    });
  }, [instanceId]);
  const instanceStyles = useStore(instanceStylesStore);
  return instanceStyles;
};

export const styleSourcesStore = atom<StyleSources>(new Map());
/**
 * find all non-local style sources
 * scoped to current tree or whole project
 */
export const availableStyleSourcesStore = shallowComputed(
  [styleSourcesStore],
  (styleSources) => {
    const availableStylesSources: StyleSource[] = [];
    for (const styleSource of styleSources.values()) {
      if (styleSource.type === "local") {
        continue;
      }
      availableStylesSources.push(styleSource);
    }
    return availableStylesSources;
  }
);

export const useSetStyleSources = (
  styleSources: [StyleSource["id"], StyleSource][]
) => {
  useSyncInitializeOnce(() => {
    styleSourcesStore.set(new Map(styleSources));
  });
};

export const styleSourceSelectionsStore = atom<StyleSourceSelections>(
  new Map()
);
export const useSetStyleSourceSelections = (
  styleSourceSelections: [Instance["id"], StyleSourceSelection][]
) => {
  useSyncInitializeOnce(() => {
    styleSourceSelectionsStore.set(new Map(styleSourceSelections));
  });
};

export const selectedStyleSourceIdStore = atom<undefined | StyleSource["id"]>(
  undefined
);

/**
 * Indexed styles data is recomputed on every styles update
 * Compumer should use shallow-equal to check all items in the list
 * are the same to avoid unnecessary rerenders
 *
 * Potential optimization can be maintaining the index as separate state
 * though will require to move away from running immer patches on array
 * of styles
 */
export const stylesIndexStore = computed(
  [stylesStore, styleSourceSelectionsStore],
  (styles, styleSourceSelections) => {
    const stylesByStyleSourceId = new Map<StyleSource["id"], StyleDecl[]>();
    for (const styleDecl of styles.values()) {
      const { styleSourceId } = styleDecl;
      let styleSourceStyles = stylesByStyleSourceId.get(styleSourceId);
      if (styleSourceStyles === undefined) {
        styleSourceStyles = [];
        stylesByStyleSourceId.set(styleSourceId, styleSourceStyles);
      }
      styleSourceStyles.push(styleDecl);
    }

    const stylesByInstanceId = new Map<Instance["id"], StyleDecl[]>();
    for (const { instanceId, values } of styleSourceSelections.values()) {
      const instanceStyles: StyleDecl[] = [];
      for (const styleSourceId of values) {
        const styleSourceStyles = stylesByStyleSourceId.get(styleSourceId);
        if (styleSourceStyles) {
          instanceStyles.push(...styleSourceStyles);
        }
      }
      stylesByInstanceId.set(instanceId, instanceStyles);
    }

    return {
      stylesByStyleSourceId,
      stylesByInstanceId,
    };
  }
);

export const breakpointsContainer = atom<Breakpoints>(new Map());
export const useBreakpoints = () => useValue(breakpointsContainer);
export const useSetBreakpoints = (
  breakpoints: [Breakpoint["id"], Breakpoint][]
) => {
  useSyncInitializeOnce(() => {
    breakpointsContainer.set(new Map(breakpoints));
  });
};

export const assetContainersStore = atom<
  Array<AssetContainer | DeletingAssetContainer>
>([]);

export const assetsStore = computed(assetContainersStore, (assetContainers) => {
  const assets = new Map<Asset["id"], Asset>();
  for (const assetContainer of assetContainers) {
    if (assetContainer.status === "uploaded") {
      assets.set(assetContainer.asset.id, assetContainer.asset);
    }
  }
  return assets;
});
export const assetsIndex = computed;

export const useSetAssets = (assets: Asset[]) => {
  useSyncInitializeOnce(() => {
    assetContainersStore.set(
      assets.map((asset) => {
        return {
          status: "uploaded",
          asset,
        };
      })
    );
  });
};

export const selectedInstanceSelectorStore = atom<undefined | InstanceSelector>(
  undefined
);

export const selectedInstanceStore = computed(
  [instancesIndexStore, selectedInstanceSelectorStore],
  (instancesIndex, selectedInstanceSelector) => {
    if (selectedInstanceSelector === undefined) {
      return;
    }
    const [selectedInstanceId] = selectedInstanceSelector;
    return instancesIndex.instancesById.get(selectedInstanceId);
  }
);

export const selectedInstanceBrowserStyleStore = atom<undefined | Style>();

export const selectedInstanceStyleSourcesStore = computed(
  [
    styleSourceSelectionsStore,
    styleSourcesStore,
    selectedInstanceSelectorStore,
  ],
  (styleSourceSelections, styleSources, selectedInstanceSelector) => {
    const selectedInstanceStyleSources: StyleSource[] = [];
    if (selectedInstanceSelector === undefined) {
      return selectedInstanceStyleSources;
    }
    const [selectedInstanceId] = selectedInstanceSelector;
    const styleSourceIds =
      styleSourceSelections.get(selectedInstanceId)?.values ?? [];
    let hasLocal = false;
    for (const styleSourceId of styleSourceIds) {
      const styleSource = styleSources.get(styleSourceId);
      if (styleSource !== undefined) {
        selectedInstanceStyleSources.push(styleSource);
        if (styleSource.type === "local") {
          hasLocal = true;
        }
      }
    }
    // generate style source when selection has not local style sources
    // it is synchronized whenever styles are updated
    if (hasLocal === false) {
      selectedInstanceStyleSources.unshift({
        type: "local",
        id: nanoid(),
      });
    }
    return selectedInstanceStyleSources;
  }
);

/**
 * Provide selected style source with fallback
 * to local style source of selected instance
 */
export const selectedStyleSourceStore = computed(
  [selectedInstanceStyleSourcesStore, selectedStyleSourceIdStore],
  (styleSources, selectedStyleSourceId) => {
    return (
      styleSources.find((item) => item.id === selectedStyleSourceId) ??
      styleSources.find((item) => item.type === "local")
    );
  }
);

export const hoveredInstanceSelectorStore = atom<undefined | InstanceSelector>(
  undefined
);
export const hoveredInstanceOutlineStore = atom<
  undefined | { label?: string; component: string; rect: DOMRect }
>(undefined);

export const isPreviewModeStore = atom<boolean>(false);
export const useIsPreviewMode = () => useValue(isPreviewModeStore);
export const useSetIsPreviewMode = (isPreviewMode: boolean) => {
  useSyncInitializeOnce(() => {
    isPreviewModeStore.set(isPreviewMode);
  });
};

const authPermitStore = atom<AuthPermit>("view");
export const useAuthPermit = () => useValue(authPermitStore);
export const useSetAuthPermit = (authPermit: AuthPermit) => {
  useSyncInitializeOnce(() => {
    authPermitStore.set(authPermit);
  });
};

export const authTokenStore = atom<string | undefined>(undefined);
export const useAuthToken = () => useValue(authTokenStore);
export const useSetAuthToken = (authToken: string | undefined) => {
  useSyncInitializeOnce(() => {
    authTokenStore.set(authToken);
  });
};

const selectedInstanceOutlineContainer = atom<{
  visible: boolean;
  rect?: DOMRect;
}>({
  visible: false,
  rect: undefined,
});
export const useSelectedInstanceOutline = () =>
  useValue(selectedInstanceOutlineContainer);

const isScrollingContainer = atom<boolean>(false);
export const useIsScrolling = () => useValue(isScrollingContainer);

// We are editing the text of that instance in text editor.
export const textEditingInstanceIdStore = atom<Instance["id"] | undefined>();
export const useTextEditingInstanceId = () =>
  useValue(textEditingInstanceIdStore);

export type DragAndDropState = {
  isDragging: boolean;
  origin?: "canvas" | "panel";
  dropTarget?: DropTargetChangePayload;
  dragItem?: DragStartPayload["dragItem"];
};
const dragAndDropStateContainer = atom<DragAndDropState>({
  isDragging: false,
});
export const useDragAndDropState = () => useValue(dragAndDropStateContainer);
