import { useMemo } from "react";
import { atom, computed, onSet } from "nanostores";
import { useStore } from "@nanostores/react";
import { nanoid } from "nanoid";
import type { AuthPermit } from "@webstudio-is/trpc-interface/index.server";
import type { ItemDropTarget, Placement } from "@webstudio-is/design-system";
import type {
  Assets,
  DataSource,
  DataSources,
  Instance,
  Page,
  Prop,
  Props,
  Resource,
  StyleDecl,
  Styles,
  StyleSource,
  StyleSources,
  StyleSourceSelections,
  System,
} from "@webstudio-is/sdk";
import type { Style } from "@webstudio-is/css-engine";
import type { Project } from "@webstudio-is/project";
import type { MarketplaceProduct } from "@webstudio-is/project-build";
import type { TokenPermissions } from "@webstudio-is/authorization-token";
import { createImageLoader, type ImageLoader } from "@webstudio-is/image";
import type { DragStartPayload } from "~/canvas/shared/use-drag-drop";
import { shallowComputed } from "../store-utils";
import { type InstanceSelector } from "../tree-utils";
import type { htmlTags as HtmlTags } from "html-tags";
import { $instances, $selectedInstanceSelector } from "./instances";
import { $selectedPage } from "./pages";
import type { UnitSizes } from "~/builder/features/style-panel/shared/css-value-input/convert-units";

export const $project = atom<Project | undefined>();

export const $publisherHost = atom<string>("wstd.work");

export const $imageLoader = atom<ImageLoader>(
  createImageLoader({ imageBaseUrl: "" })
);

export const $publishedOrigin = computed(
  [$project, $publisherHost],
  (project, publisherHost) => `https://${project?.domain}.${publisherHost}`
);

export const $rootInstance = computed(
  [$instances, $selectedPage],
  (instances, selectedPage) => {
    if (selectedPage === undefined) {
      return undefined;
    }
    return instances.get(selectedPage.rootInstanceId);
  }
);

export const $dataSources = atom<DataSources>(new Map());
export const $dataSourceVariables = atom<Map<DataSource["id"], unknown>>(
  new Map()
);

export const updateSystem = (page: Page, update: Partial<System>) => {
  const dataSourceVariables = new Map($dataSourceVariables.get());
  const system = dataSourceVariables.get(page.systemDataSourceId) as
    | undefined
    | System;

  const newSystem: System = {
    search: {},
    params: {},
    // This value seems like doesn't matter
    origin: "",
    ...system,
    ...update,
  };
  dataSourceVariables.set(page.systemDataSourceId, newSystem);
  $dataSourceVariables.set(dataSourceVariables);
};

export const $resources = atom(new Map<Resource["id"], Resource>());
export const $resourceValues = atom(new Map<Resource["id"], unknown>());

export const $props = atom<Props>(new Map());
export const $propsIndex = computed($props, (props) => {
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

export const $styles = atom<Styles>(new Map());

export const useInstanceStyles = (instanceId: undefined | Instance["id"]) => {
  const instance$styles = useMemo(() => {
    return shallowComputed([$stylesIndex], (stylesIndex) => {
      if (instanceId === undefined) {
        return [];
      }
      return stylesIndex.stylesByInstanceId.get(instanceId) ?? [];
    });
  }, [instanceId]);
  const instanceStyles = useStore(instance$styles);
  return instanceStyles;
};

export const $styleSources = atom<StyleSources>(new Map());

export const $styleSourceSelections = atom<StyleSourceSelections>(new Map());

export type StyleSourceSelector = {
  styleSourceId: StyleSource["id"];
  state?: string;
};

export const $selectedStyleSources = atom(
  new Map<Instance["id"], StyleSource["id"]>()
);
export const $selectedStyleState = atom<StyleDecl["state"]>();
// reset style state whenever selected instance change
onSet($selectedInstanceSelector, () => {
  $selectedStyleState.set(undefined);
});

/**
 * Indexed styles data is recomputed on every styles update
 * Compumer should use shallow-equal to check all items in the list
 * are the same to avoid unnecessary rerenders
 *
 * Potential optimization can be maintaining the index as separate state
 * though will require to move away from running immer patches on array
 * of styles
 */
export const $stylesIndex = computed(
  [$styles, $styleSourceSelections],
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

export const $assets = atom<Assets>(new Map());

export const $selectedInstanceBrowserStyle = atom<undefined | Style>();

// Init with some defaults to avoid undefined
export const $selectedInstanceUnitSizes = atom<UnitSizes>({
  ch: 8,
  vw: 3.2,
  vh: 4.8,
  em: 16,
  rem: 16,
  px: 1,
});

/**
 * instanceId => tagName store for selected instance and its ancestors
 */
export const $selectedInstanceIntanceToTag = atom<
  undefined | Map<Instance["id"], HtmlTags>
>();

/**
 * pending means: previous selected instance unmounted,
 * and we don't know yet whether a new one will mount
 **/
export const $selectedInstanceRenderState = atom<
  "mounted" | "notMounted" | "pending"
>("notMounted");

export const $selectedInstanceStatesByStyleSourceId = computed(
  [$styles, $styleSourceSelections, $selectedInstanceSelector],
  (styles, styleSourceSelections, selectedInstanceSelector) => {
    const statesByStyleSourceId = new Map<StyleSource["id"], string[]>();
    if (selectedInstanceSelector === undefined) {
      return statesByStyleSourceId;
    }
    const styleSourceIds = new Set(
      styleSourceSelections.get(selectedInstanceSelector[0])?.values
    );
    for (const styleDecl of styles.values()) {
      if (
        styleDecl.state === undefined ||
        styleSourceIds.has(styleDecl.styleSourceId) === false
      ) {
        continue;
      }
      let states = statesByStyleSourceId.get(styleDecl.styleSourceId);
      if (states === undefined) {
        states = [];
        statesByStyleSourceId.set(styleDecl.styleSourceId, states);
      }
      if (states.includes(styleDecl.state) === false) {
        states.push(styleDecl.state);
      }
    }
    return statesByStyleSourceId;
  }
);

export const $selectedInstanceStyleSources = computed(
  [$styleSourceSelections, $styleSources, $selectedInstanceSelector],
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
      // always put local style source last
      selectedInstanceStyleSources.push({
        type: "local",
        id: nanoid(),
      });
    }
    return selectedInstanceStyleSources;
  }
);

export const $selectedOrLastStyleSourceSelector = computed(
  [
    $selectedInstanceStyleSources,
    $selectedStyleSources,
    $selectedInstanceSelector,
    $selectedStyleState,
  ],
  (
    styleSources,
    selectedStyleSources,
    selectedInstanceSelector,
    selectedStyleState
  ) => {
    if (selectedInstanceSelector === undefined) {
      return;
    }
    const [instanceId] = selectedInstanceSelector;
    const styleSourceId = selectedStyleSources.get(instanceId);
    // always fallback to local (the last one) style source
    const lastStyleSource = styleSources.at(-1);
    const matchedStyleSource = styleSources.find(
      (styleSource) => styleSource.id === styleSourceId
    );
    const styleSource = matchedStyleSource ?? lastStyleSource;
    if (styleSource) {
      return { styleSourceId: styleSource.id, state: selectedStyleState };
    }
  }
);

/**
 * Provide selected style source with fallback
 * to the last style source of selected instance
 */
export const $selectedStyleSource = computed(
  [
    $selectedInstanceStyleSources,
    $selectedStyleSources,
    $selectedInstanceSelector,
  ],
  (styleSources, selectedStyleSources, selectedInstanceSelector) => {
    if (selectedInstanceSelector === undefined) {
      return;
    }
    const [instanceId] = selectedInstanceSelector;
    const selectedStyleSourceId = selectedStyleSources.get(instanceId);
    return (
      styleSources.find((item) => item.id === selectedStyleSourceId) ??
      styleSources.at(-1)
    );
  }
);

/**
 * Store the list of active states inferred from dom element
 * to display style values as remote
 */
export const $selectedInstanceStates = atom(new Set<string>());

export const $hoveredInstanceSelector = atom<undefined | InstanceSelector>(
  undefined
);

export const $isPreviewMode = atom<boolean>(false);

export const $authPermit = atom<AuthPermit>("view");
export const $authTokenPermissions = atom<TokenPermissions>({
  canClone: true,
  canCopy: true,
});

export const $authToken = atom<string | undefined>(undefined);

export const $toastErrors = atom<string[]>([]);

export type DragAndDropState = {
  isDragging: boolean;
  dropTarget?: ItemDropTarget;
  dragPayload?: DragStartPayload;
  placementIndicator?: Placement;
};

export const $dragAndDropState = atom<DragAndDropState>({
  isDragging: false,
});

export const $marketplaceProduct = atom<undefined | MarketplaceProduct>();

export const $inspectorLastInputTime = atom<number>(0);
