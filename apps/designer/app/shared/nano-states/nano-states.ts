import { useMemo } from "react";
import { atom, computed, type WritableAtom } from "nanostores";
import { useStore } from "@nanostores/react";
import type { Asset } from "@webstudio-is/asset-uploader";
import type {
  Instance,
  Props,
  Styles,
  StyleSource,
  StyleSources,
  StyleSourceSelections,
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

const useValue = <T>(atom: WritableAtom<T>) => {
  const value = useStore(atom);
  return [value, atom.set] as const;
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
  (rootInstance) => {
    const instancesById = new Map<Instance["id"], Instance>();
    const traverseInstances = (instance: Instance) => {
      instancesById.set(instance.id, instance);
      for (const child of instance.children) {
        if (child.type === "instance") {
          traverseInstances(child);
        }
      }
    };
    if (rootInstance !== undefined) {
      traverseInstances(rootInstance);
    }
    return {
      instancesById,
    };
  }
);

export const propsStore = atom<Props>([]);
export const propsIndexStore = computed(propsStore, (props) => {
  const propsByInstanceId = new Map<Instance["id"], Props>();
  for (const prop of props) {
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
export const useSetProps = (props: Props) => {
  useSyncInitializeOnce(() => {
    propsStore.set(props);
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

export const styleSourcesStore = atom<StyleSources>([]);
export const styleSourcesIndexStore = computed(
  styleSourcesStore,
  (styleSources) => {
    const styleSourcesById = new Map<StyleSource["id"], StyleSource>();
    for (const styleSource of styleSources) {
      styleSourcesById.set(styleSource.id, styleSource);
    }
    return {
      styleSourcesById,
    };
  }
);

export const useSetStyleSources = (styleSources: StyleSources) => {
  useSyncInitializeOnce(() => {
    styleSourcesStore.set(styleSources);
  });
};

export const styleSourceSelectionsStore = atom<StyleSourceSelections>([]);
export const useSetStyleSourceSelections = (
  styleSourceSelections: StyleSourceSelections
) => {
  useSyncInitializeOnce(() => {
    styleSourceSelectionsStore.set(styleSourceSelections);
  });
};

export const styleSourceSelectionsIndexStore = computed(
  [styleSourceSelectionsStore, styleSourcesIndexStore],
  (styleSourceSelections, styleSourcesIndex) => {
    const { styleSourcesById } = styleSourcesIndex;
    const styleSourcesByInstanceId = new Map<Instance["id"], StyleSource[]>();
    for (const { instanceId, values } of styleSourceSelections) {
      const styleSources: StyleSources = [];
      for (const styleSourceId of values) {
        const styleSource = styleSourcesById.get(styleSourceId);
        if (styleSource === undefined) {
          continue;
        }
        styleSources.push(styleSource);
      }
      styleSourcesByInstanceId.set(instanceId, styleSources);
    }
    return {
      styleSourcesByInstanceId,
    };
  }
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
    for (const stylesItem of styles) {
      const { styleSourceId } = stylesItem;
      let styleSourceStyles = stylesByStyleSourceId.get(styleSourceId);
      if (styleSourceStyles === undefined) {
        styleSourceStyles = [];
        stylesByStyleSourceId.set(styleSourceId, styleSourceStyles);
      }
      styleSourceStyles.push(stylesItem);
    }

    const stylesByInstanceId = new Map<Instance["id"], Styles>();
    for (const { instanceId, values } of styleSourceSelections) {
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

export const hoveredInstanceIdStore = atom<undefined | Instance["id"]>(
  undefined
);
export const hoveredInstanceOutlineStore = atom<
  undefined | { component: string; rect: DOMRect }
>(undefined);

export const isPreviewModeStore = atom<boolean>(false);
export const useIsPreviewMode = () => useValue(isPreviewModeStore);

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
