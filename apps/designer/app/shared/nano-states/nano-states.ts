import { useMemo } from "react";
import { atom, computed, type WritableAtom } from "nanostores";
import { useStore } from "@nanostores/react";
import { nanoid } from "nanoid";
import type { AuthPermit } from "@webstudio-is/trpc-interface";
import type { Asset } from "@webstudio-is/asset-uploader";
import {
  Instance,
  Prop,
  Props,
  Styles,
  StyleSource,
  StyleSources,
  StyleSourceSelection,
  StyleSourceSelections,
  Tree,
} from "@webstudio-is/project-build";
import type { Breakpoint, Style } from "@webstudio-is/css-data";
import type {
  DropTargetChangePayload,
  DragStartPayload,
} from "~/canvas/shared/use-drag-drop";
import type {
  AssetContainer,
  DeletingAssetContainer,
} from "~/designer/shared/assets";
import { useSyncInitializeOnce } from "../hook-utils";
import { shallowComputed } from "../store-utils";
import { createInstancesIndex } from "../tree-utils";

const useValue = <T>(atom: WritableAtom<T>) => {
  const value = useStore(atom);
  return [value, atom.set] as const;
};

export const treeIdStore = atom<undefined | Tree["id"]>(undefined);
export const useSetTreeId = (treeId: Tree["id"]) => {
  useSyncInitializeOnce(() => {
    treeIdStore.set(treeId);
  });
};

export const rootInstanceContainer = atom<Instance | undefined>();
export const useRootInstance = () => useValue(rootInstanceContainer);
export const useSetRootInstance = (root: Instance) => {
  useSyncInitializeOnce(() => {
    rootInstanceContainer.set(root);
  });
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

export const stylesStore = atom<Styles>([]);

export const useSetStyles = (styles: Styles) => {
  useSyncInitializeOnce(() => {
    stylesStore.set(styles);
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
  [styleSourcesStore, treeIdStore],
  (styleSources, treeId) => {
    if (treeId === undefined) {
      return [];
    }
    const availableStylesSources: StyleSource[] = [];
    for (const styleSource of styleSources.values()) {
      if (styleSource.type === "local") {
        continue;
      }
      if (styleSource.treeId === treeId || styleSource.treeId === undefined) {
        availableStylesSources.push(styleSource);
      }
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
    const stylesByStyleSourceId = new Map<StyleSource["id"], Styles>();
    for (const styleDecl of styles) {
      const { styleSourceId } = styleDecl;
      let styleSourceStyles = stylesByStyleSourceId.get(styleSourceId);
      if (styleSourceStyles === undefined) {
        styleSourceStyles = [];
        stylesByStyleSourceId.set(styleSourceId, styleSourceStyles);
      }
      styleSourceStyles.push(styleDecl);
    }

    const stylesByInstanceId = new Map<Instance["id"], Styles>();
    for (const { instanceId, values } of styleSourceSelections.values()) {
      const instanceStyles: Styles = [];
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

export const breakpointsContainer = atom<Breakpoint[]>([]);
export const useBreakpoints = () => useValue(breakpointsContainer);
export const useSetBreakpoints = (breakpoints: Breakpoint[]) => {
  useSyncInitializeOnce(() => {
    breakpointsContainer.set(breakpoints);
  });
};

export const assetContainersStore = atom<
  Array<AssetContainer | DeletingAssetContainer>
>([]);

export const assetsStore = computed(assetContainersStore, (assetContainers) => {
  const assets: Asset[] = [];
  for (const assetContainer of assetContainers) {
    if (assetContainer.status === "uploaded") {
      assets.push(assetContainer.asset);
    }
  }
  return assets;
});

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

export const selectedInstanceIdStore = atom<undefined | Instance["id"]>(
  undefined
);
export const selectedInstanceStore = computed(
  [instancesIndexStore, selectedInstanceIdStore],
  (instancesIndex, selectedInstanceId) => {
    if (selectedInstanceId === undefined) {
      return;
    }
    return instancesIndex.instancesById.get(selectedInstanceId);
  }
);

export const selectedInstanceBrowserStyleStore = atom<undefined | Style>();

export const selectedInstanceStyleSourcesStore = computed(
  [
    styleSourceSelectionsStore,
    styleSourcesStore,
    selectedInstanceIdStore,
    treeIdStore,
  ],
  (styleSourceSelections, styleSources, selectedInstanceId, treeId) => {
    const selectedInstanceStyleSources: StyleSource[] = [];
    if (selectedInstanceId === undefined) {
      return selectedInstanceStyleSources;
    }
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
    // it is synchronized whenever instance style sources or styles are updated
    if (hasLocal === false && treeId !== undefined) {
      selectedInstanceStyleSources.push({
        type: "local",
        treeId,
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

export const hoveredInstanceIdStore = atom<undefined | Instance["id"]>(
  undefined
);
export const hoveredInstanceOutlineStore = atom<
  undefined | { component: string; rect: DOMRect }
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
const textEditingInstanceIdContainer = atom<Instance["id"] | undefined>();
export const useTextEditingInstanceId = () =>
  useValue(textEditingInstanceIdContainer);

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
