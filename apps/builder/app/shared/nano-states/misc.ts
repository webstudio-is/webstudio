import { atom, computed, onSet } from "nanostores";
import { nanoid } from "nanoid";
import type { AuthPermit } from "@webstudio-is/trpc-interface/index.server";
import { toast, type Placement } from "@webstudio-is/design-system";
import type {
  Assets,
  DataSources,
  Instance,
  Prop,
  Props,
  Resource,
  StyleDecl,
  Styles,
  StyleSource,
  StyleSources,
  StyleSourceSelections,
} from "@webstudio-is/sdk";
import type { Style } from "@webstudio-is/css-engine";
import type { Project } from "@webstudio-is/project";
import type { MarketplaceProduct } from "@webstudio-is/project-build";
import type { TokenPermissions } from "@webstudio-is/authorization-token";
import { createImageLoader, type ImageLoader } from "@webstudio-is/image";
import type { DragStartPayload } from "~/canvas/shared/use-drag-drop";
import { type InstanceSelector } from "../tree-utils";
import type { HtmlTags } from "html-tags";
import { $selectedInstanceSelector } from "./instances";
import type { UnitSizes } from "~/builder/features/style-panel/shared/css-value-input/convert-units";
import type { Simplify } from "type-fest";
import type { AssetType } from "@webstudio-is/asset-uploader";
import type { ChildrenOrientation } from "node_modules/@webstudio-is/design-system/src/components/primitives/dnd/geometry-utils";
import { $selectedInstance } from "../awareness";
import type { UserPlanFeatures } from "../db/user-plan-features.server";

export const $project = atom<Project | undefined>();

export const $publisherHost = atom<string>("wstd.work");

export const $imageLoader = atom<ImageLoader>(
  createImageLoader({ imageBaseUrl: "" })
);

export const $publishedOrigin = computed(
  [$project, $publisherHost],
  (project, publisherHost) => `https://${project?.domain}.${publisherHost}`
);

export const $dataSources = atom<DataSources>(new Map());

export const $resources = atom(new Map<Resource["id"], Resource>());

export const $props = atom<Props>(new Map());

export const $memoryProps = atom<Map<string, Props>>(new Map());

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

export type UploadingFileData = Simplify<
  {
    // common props
    assetId: string;
    type: AssetType;
    objectURL: string;
  } & (
    | {
        source: "file";
        file: File;
      }
    | {
        source: "url";
        url: string;
      }
  )
>;

export const $uploadingFilesDataStore = atom<UploadingFileData[]>([]);

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
  [$styles, $styleSourceSelections, $selectedInstance],
  (styles, styleSourceSelections, selectedInstance) => {
    const statesByStyleSourceId = new Map<StyleSource["id"], string[]>();
    if (selectedInstance === undefined) {
      return statesByStyleSourceId;
    }
    const styleSourceIds = new Set(
      styleSourceSelections.get(selectedInstance.id)?.values
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
  [$styleSourceSelections, $styleSources, $selectedInstance],
  (styleSourceSelections, styleSources, selectedInstance) => {
    const selectedInstanceStyleSources: StyleSource[] = [];
    if (selectedInstance === undefined) {
      return selectedInstanceStyleSources;
    }
    const styleSourceIds =
      styleSourceSelections.get(selectedInstance.id)?.values ?? [];
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
    $selectedInstance,
    $selectedStyleState,
  ],
  (
    styleSources,
    selectedStyleSources,
    selectedInstance,
    selectedStyleState
  ) => {
    if (selectedInstance === undefined) {
      return;
    }
    const styleSourceId = selectedStyleSources.get(selectedInstance.id);
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
  [$selectedInstanceStyleSources, $selectedStyleSources, $selectedInstance],
  (styleSources, selectedStyleSources, selectedInstance) => {
    if (selectedInstance === undefined) {
      return;
    }
    const selectedStyleSourceId = selectedStyleSources.get(selectedInstance.id);
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

// keep in sync with user-plan-features.server
export const $userPlanFeatures = atom<UserPlanFeatures>({
  allowShareAdminLinks: false,
  allowDynamicData: false,
  maxContactEmails: 0,
  maxDomainsAllowedPerUser: 1,
  hasSubscription: false,
  hasProPlan: false,
});

const builderModes = ["design", "preview", "content"] as const;
export type BuilderMode = (typeof builderModes)[number];
export const isBuilderMode = (mode: string | null): mode is BuilderMode =>
  builderModes.includes(mode as BuilderMode);
export const $builderMode = atom<BuilderMode>("design");

export const $isPreviewMode = computed(
  $builderMode,
  (mode) => mode === "preview"
);
export const $isContentMode = computed(
  $builderMode,
  (mode) => mode === "content"
);
export const $isDesignMode = computed(
  $builderMode,
  (mode) => mode === "design"
);

export const $authPermit = atom<AuthPermit>("view");
export const $authTokenPermissions = atom<TokenPermissions>({
  canClone: true,
  canCopy: true,
});

export const $authToken = atom<string | undefined>(undefined);

export const $isContentModeAllowed = computed(
  [$authToken, $userPlanFeatures],
  (token, userPlanFeatures) => {
    // In own projects, everyone can edit content
    if (token === undefined) {
      return true;
    }

    // In shared projects, only Pro users can share editable links, so check the plan features of the user who shared the link
    return userPlanFeatures.hasProPlan === true;
  }
);

export const $isDesignModeAllowed = computed([$authPermit], (authPermit) => {
  return authPermit !== "edit";
});

let previousBuilderMode: BuilderMode | undefined = undefined;

export const toggleBuilderMode = (mode: BuilderMode) => {
  const currentMode = $builderMode.get();

  if (currentMode === mode) {
    if (previousBuilderMode !== undefined) {
      setBuilderMode(previousBuilderMode);
      previousBuilderMode = currentMode;
      return;
    }

    // Switch back
    const availableModes: BuilderMode[] = [];
    if ($isDesignModeAllowed.get() && currentMode !== "design") {
      availableModes.push("design");
    }
    if ($isContentModeAllowed.get() && currentMode !== "content") {
      availableModes.push("content");
    }
    if (currentMode !== "preview") {
      availableModes.push("preview");
    }

    setBuilderMode(availableModes[0] ?? "preview");

    previousBuilderMode = currentMode;
    return;
  }

  previousBuilderMode = currentMode;
  setBuilderMode(mode);
};

export const setBuilderMode = (mode: BuilderMode | null) => {
  const authPermit = $authPermit.get();

  if (mode === "content" && !$isContentModeAllowed.get()) {
    // This is content link from a non pro user, we don't allow content mode for such links
    toast.info(
      "Content mode is not available for this link. The link’s author must have a Pro plan."
    );

    $builderMode.set("preview");
    return;
  }

  if (mode === "design" && !$isDesignModeAllowed.get()) {
    toast.info("Design mode is not available for content edit links.");

    $builderMode.set("content");
    return;
  }

  if (authPermit === "view") {
    $builderMode.set(mode ?? "preview");
    return;
  }

  const defaultMode = $isDesignModeAllowed.get()
    ? "design"
    : $isContentModeAllowed.get()
      ? "content"
      : "preview";

  $builderMode.set(mode ?? defaultMode);
};

export const $toastErrors = atom<string[]>([]);

export type ItemDropTarget = {
  itemSelector: InstanceSelector;
  indexWithinChildren: number;
  placement: {
    closestChildIndex: number;
    indexAdjustment: number;
    childrenOrientation: ChildrenOrientation;
  };
};

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
