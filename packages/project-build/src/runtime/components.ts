import equal from "fast-deep-equal";
import {
  elementComponent,
  instanceComponent,
  ROOT_INSTANCE_ID,
  webstudioFragment,
  type Breakpoints,
  type DataSource,
  type DataSources,
  type Instance,
  type Instances,
  type Page,
  type PageTemplate,
  type Pages,
  type Props,
  type Resources,
  type Styles,
  type StyleSources,
  type StyleSourceSelections,
  type WebstudioData,
  type WebstudioFragment,
} from "@webstudio-is/sdk";
import { componentMetas } from "@webstudio-is/sdk-components-registry/metas";
import {
  compactBuilderPatchPayload,
  type BuilderPatch,
  type BuilderPatchChange,
} from "../contracts/patch";
import type { BuilderState } from "../state/builder-state";
import { getComponentTemplates } from "./component-templates";
import {
  createComponentTemplateFragment,
  type ComponentTemplateRegistry,
} from "./component-template";
import { isComponentAvailableForDocumentType } from "./component-catalog";
import type {
  ComponentInsertResult,
  FragmentInsertResult,
} from "./component-insert-contract";
import {
  createCollectionFragment,
  insertCollectionInput,
  type InsertCollectionResult,
} from "./collection";
import type { BuilderRuntimeContext } from "./context";
import { isFragmentContentModeCopyableProp } from "./content-mode-copy-policy";
import { findAvailableVariables } from "./data";
import { addZodValidationIssue, throwBuilderRuntimeError } from "./errors";
import { insertWebstudioFragmentCopy } from "./fragment";
import {
  createInstanceAppendPayload,
  createInstanceChild,
  insertIndexInput,
  instanceInsertModeInput,
} from "./instances";
import { createRuntimeMutation, type BuilderRuntimeMutation } from "./mutation";
import { getSlotFragmentDropTargetMutable } from "./slot";
import type { ConflictResolution } from "./style-copy";
import { z } from "zod";

const conflictResolutionInput = z.enum(["ours", "theirs", "merge"]);

export const insertComponentInput = z.object({
  parentInstanceId: z.string(),
  component: instanceComponent.describe(
    'Exact component id returned by components.search, components.get, or templates.get. Do not derive HTML shorthands such as "ws:div" or "ws:form". For a native HTML element, use "ws:element" and set "tag".'
  ),
  tag: z
    .string()
    .min(1)
    .optional()
    .describe('Required when component is "ws:element"; omit otherwise.'),
  mode: instanceInsertModeInput.optional(),
  insertIndex: insertIndexInput.optional(),
});

export const insertFragmentInput = z
  .object({
    parentInstanceId: z.string().optional(),
    fragment: webstudioFragment.describe(
      "Structured Webstudio fragment produced by Webstudio JSX/template helpers. Runtime remaps fragment ids to generated project ids."
    ),
    conflictResolution: conflictResolutionInput.optional(),
    contentMode: z.boolean().optional(),
    mode: instanceInsertModeInput.optional(),
    insertIndex: insertIndexInput.optional(),
  })
  .superRefine((input, context) => {
    if (
      input.fragment.children.length > 0 &&
      input.parentInstanceId === undefined
    ) {
      addZodValidationIssue(context, {
        code: "missing_fragment_parent",
        path: ["parentInstanceId"],
        message: "Required when inserting a fragment with children",
        constraint: "required_when:fragment.children.length>0",
        example: "parent-instance-id",
      });
    }
  });

export const componentInsertNamespaces = [
  "instances",
  "props",
  "dataSources",
  "resources",
  "styleSources",
  "styleSourceSelections",
  "styles",
  "breakpoints",
  "assets",
] as const;

export const componentInsertReadNamespaces = [
  "pages",
  ...componentInsertNamespaces,
] as const;

const canContainDescendant = (
  ancestorComponent: Instance["component"],
  descendantComponent: Instance["component"],
  visited = new Set<Instance["component"]>()
): boolean => {
  if (visited.has(ancestorComponent)) {
    return false;
  }
  visited.add(ancestorComponent);
  const contentModel = componentMetas.get(ancestorComponent)?.contentModel;
  const directOrNested = [
    ...(contentModel?.children ?? []),
    ...(contentModel?.descendants ?? []),
  ];
  if (directOrNested.includes(descendantComponent)) {
    return true;
  }
  return directOrNested.some(
    (descendant) =>
      typeof descendant === "string" &&
      componentMetas.has(descendant) &&
      canContainDescendant(descendant, descendantComponent, visited)
  );
};

const getStandaloneInsertError = (component: Instance["component"]) => {
  const meta = componentMetas.get(component);
  if (meta?.contentModel?.category !== "none") {
    return;
  }
  const suggestions = Array.from(componentMetas.entries())
    .filter(([candidateComponent, candidateMeta]) => {
      if (candidateMeta.contentModel?.category === "none") {
        return false;
      }
      return canContainDescendant(candidateComponent, component);
    })
    .map(([candidateComponent]) => candidateComponent);
  const suggestion =
    suggestions.length === 0
      ? "Insert the nearest root component template that contains this component."
      : `Insert one of these template/root components instead: ${suggestions
          .map((suggestion) => `"${suggestion}"`)
          .join(", ")}.`;
  return `Component "${component}" cannot be inserted standalone because its contentModel.category is "none". ${suggestion} Required provider/parent components must be created by the template.`;
};

const getUnknownCoreComponentError = ({
  component,
  templates,
}: {
  component: Instance["component"];
  templates: ComponentTemplateRegistry;
}) => {
  if (
    component.startsWith("ws:") &&
    componentMetas.has(component) === false &&
    templates.has(component) === false
  ) {
    return `Component "${component}" does not exist. The "ws:" namespace contains Webstudio core components, not HTML tag shorthands. To create a native HTML element, use component "ws:element" with its "tag" property, for example <ws.element ws:tag="div">...</ws.element>.`;
  }
};

type ComponentInsertState = Pick<
  BuilderState,
  (typeof componentInsertReadNamespaces)[number]
>;

const getRequiredComponentInsertState = (state: ComponentInsertState) => {
  for (const namespace of componentInsertNamespaces) {
    if (state[namespace] === undefined) {
      return throwBuilderRuntimeError(
        "BAD_REQUEST",
        `${namespace} namespace is missing`
      );
    }
  }
  return state as {
    pages: Pages;
    instances: Instances;
    props: Props;
    dataSources: DataSources;
    resources: Resources;
    styleSources: StyleSources;
    styleSourceSelections: StyleSourceSelections;
    styles: Styles;
    breakpoints: Breakpoints;
    assets: WebstudioData["assets"];
  };
};

const cloneFragmentData = (
  state: ReturnType<typeof getRequiredComponentInsertState>
): Omit<WebstudioData, "pages"> => ({
  instances: cloneMap(state.instances),
  props: cloneMap(state.props),
  dataSources: cloneMap(state.dataSources),
  resources: cloneMap(state.resources),
  styleSources: cloneMap(state.styleSources),
  styleSourceSelections: cloneMap(state.styleSourceSelections),
  styles: cloneMap(state.styles),
  breakpoints: cloneMap(state.breakpoints),
  assets: cloneMap(state.assets),
});

const cloneMap = <Key, Value>(map: Map<Key, Value>) =>
  new Map(
    Array.from(map, ([key, value]) => [key, structuredClone(value)] as const)
  );

const getPageByInstanceId = (
  pages: Pages,
  instances: Instances,
  instanceId: Instance["id"]
): Page | PageTemplate | undefined => {
  const parentByChildId = new Map<Instance["id"], Instance["id"]>();
  for (const instance of instances.values()) {
    for (const child of instance.children ?? []) {
      if (child.type === "id") {
        parentByChildId.set(child.value, instance.id);
      }
    }
  }
  const rootInstanceIds = new Map<Instance["id"], Page | PageTemplate>();
  for (const page of pages.pages.values()) {
    rootInstanceIds.set(page.rootInstanceId, page);
  }
  for (const template of pages.pageTemplates?.values() ?? []) {
    rootInstanceIds.set(template.rootInstanceId, template);
  }
  const visited = new Set<Instance["id"]>();
  let currentId: Instance["id"] | undefined = instanceId;
  while (currentId !== undefined && visited.has(currentId) === false) {
    visited.add(currentId);
    const page = rootInstanceIds.get(currentId);
    if (page !== undefined) {
      return page;
    }
    currentId = parentByChildId.get(currentId);
  }
};

const getInsertionPage = (
  mutationState: ReturnType<typeof getRequiredComponentInsertState>,
  parent: Instance
) => {
  const page = getPageByInstanceId(
    mutationState.pages,
    mutationState.instances,
    parent.id
  );
  if (page === undefined) {
    return throwBuilderRuntimeError(
      "BAD_REQUEST",
      "Cannot insert component because the target page could not be determined."
    );
  }
  return page;
};

const createRecordAddPatches = <Value>({
  before,
  after,
  skip = new Set(),
}: {
  before: Map<string, Value>;
  after: Map<string, Value>;
  skip?: Set<string>;
}): BuilderPatch[] => {
  const patches: BuilderPatch[] = [];
  for (const [id, value] of after) {
    if (skip.has(id)) {
      continue;
    }
    const previous = before.get(id);
    if (previous !== undefined) {
      if (equal(previous, value) === false) {
        return throwBuilderRuntimeError(
          "CONFLICT",
          `Generated record id "${id}" already exists`
        );
      }
      continue;
    }
    patches.push({ op: "add", path: [id], value });
  }
  return patches;
};

const createRecordUpsertPatches = <Value>({
  before,
  after,
}: {
  before: Map<string, Value>;
  after: Map<string, Value>;
}): BuilderPatch[] => {
  const patches: BuilderPatch[] = [];
  for (const [id, value] of after) {
    const previous = before.get(id);
    if (previous === undefined) {
      patches.push({ op: "add", path: [id], value });
      continue;
    }
    if (equal(previous, value) === false) {
      patches.push({ op: "replace", path: [id], value });
    }
  }
  return patches;
};

const createFragmentPayload = ({
  before,
  after,
  instancePatches,
}: {
  before: ReturnType<typeof getRequiredComponentInsertState>;
  after: Omit<WebstudioData, "pages">;
  instancePatches: BuilderPatch[];
}): BuilderPatchChange[] =>
  compactBuilderPatchPayload([
    {
      namespace: "assets",
      patches: createRecordAddPatches({
        before: before.assets,
        after: after.assets,
      }),
    },
    {
      namespace: "breakpoints",
      patches: createRecordAddPatches({
        before: before.breakpoints,
        after: after.breakpoints,
      }),
    },
    {
      namespace: "dataSources",
      patches: createRecordAddPatches({
        before: before.dataSources,
        after: after.dataSources,
      }),
    },
    {
      namespace: "resources",
      patches: createRecordAddPatches({
        before: before.resources,
        after: after.resources,
      }),
    },
    {
      namespace: "styleSources",
      patches: createRecordAddPatches({
        before: before.styleSources,
        after: after.styleSources,
      }),
    },
    {
      namespace: "styleSourceSelections",
      patches: createRecordAddPatches({
        before: before.styleSourceSelections,
        after: after.styleSourceSelections,
      }),
    },
    {
      namespace: "styles",
      patches: createRecordUpsertPatches({
        before: before.styles,
        after: after.styles,
      }),
    },
    {
      namespace: "instances",
      patches: instancePatches,
    },
    {
      namespace: "props",
      patches: createRecordAddPatches({
        before: before.props,
        after: after.props,
      }),
    },
  ]);

const createFragmentInsertPayload = ({
  before,
  after,
  parent,
  insertIndex,
  insertedChildren,
}: {
  before: ReturnType<typeof getRequiredComponentInsertState>;
  after: Omit<WebstudioData, "pages">;
  parent: Instance;
  insertIndex: number;
  insertedChildren: Instance["children"];
}): BuilderPatchChange[] => {
  const shouldSetChildrenArray =
    (parent.children ?? []).length === 0 && insertIndex === 0;
  return createFragmentPayload({
    before,
    after,
    instancePatches: [
      ...createRecordAddPatches({
        before: before.instances,
        after: after.instances,
        skip: new Set([parent.id]),
      }),
      ...(shouldSetChildrenArray
        ? [
            {
              op: "add" as const,
              path: [parent.id, "children"],
              value: insertedChildren,
            },
          ]
        : insertedChildren.map((child, index) => ({
            op: "add" as const,
            path: [parent.id, "children", insertIndex + index],
            value: child,
          }))),
    ],
  });
};

const createTokenFragmentInsertPayload = ({
  before,
  after,
}: {
  before: ReturnType<typeof getRequiredComponentInsertState>;
  after: Omit<WebstudioData, "pages">;
}): BuilderPatchChange[] =>
  compactBuilderPatchPayload([
    {
      namespace: "assets",
      patches: createRecordAddPatches({
        before: before.assets,
        after: after.assets,
      }),
    },
    {
      namespace: "breakpoints",
      patches: createRecordAddPatches({
        before: before.breakpoints,
        after: after.breakpoints,
      }),
    },
    {
      namespace: "styleSources",
      patches: createRecordAddPatches({
        before: before.styleSources,
        after: after.styleSources,
      }),
    },
    {
      namespace: "styles",
      patches: createRecordUpsertPatches({
        before: before.styles,
        after: after.styles,
      }),
    },
  ]);

const validateFragmentComponent = ({
  instance,
  templates,
  page,
}: {
  instance: Instance;
  templates: ComponentTemplateRegistry;
  page: Page | PageTemplate;
}) => {
  const { component } = instance;
  const meta = componentMetas.get(component);
  const unknownCoreComponentError = getUnknownCoreComponentError({
    component,
    templates,
  });
  if (unknownCoreComponentError !== undefined) {
    return throwBuilderRuntimeError("BAD_REQUEST", unknownCoreComponentError);
  }
  if (
    component === "ws:element" &&
    (typeof instance.tag !== "string" || instance.tag.length === 0)
  ) {
    return throwBuilderRuntimeError(
      "BAD_REQUEST",
      'Component "ws:element" requires a non-empty tag, for example <ws.element ws:tag="section">...</ws.element>. Use a Webstudio component such as <$.Box>...</$.Box> when you do not need a specific HTML tag.'
    );
  }
  const insertCategory = templates.get(component)?.category ?? meta?.category;
  if (
    isComponentAvailableForDocumentType({
      component,
      category: insertCategory,
      documentType: page.meta.documentType ?? "html",
    }) === false
  ) {
    if (insertCategory === "xml") {
      return throwBuilderRuntimeError(
        "BAD_REQUEST",
        `XML component "${component}" can only be inserted on pages with document type "xml". Change the page document type in page settings before inserting XML components.`
      );
    }
    return throwBuilderRuntimeError(
      "BAD_REQUEST",
      `Component "${component}" is not available for pages with document type "${page.meta.documentType ?? "html"}". Change the page document type in page settings or choose an available component.`
    );
  }
  if (meta === undefined && insertCategory === undefined) {
    return;
  }
};

const getSubtreeComponents = (
  root: Instance,
  instancesById: ReadonlyMap<Instance["id"], Instance>
) => {
  const components = new Set<Instance["component"]>();
  const visit = (instance: Instance) => {
    components.add(instance.component);
    for (const child of instance.children) {
      if (child.type !== "id") {
        continue;
      }
      const childInstance = instancesById.get(child.value);
      if (childInstance !== undefined) {
        visit(childInstance);
      }
    }
  };
  visit(root);
  return components;
};

const createComponentEdge = (
  parentComponent: Instance["component"],
  childComponent: Instance["component"]
) => `${parentComponent}\0${childComponent}`;

export const parseComponentEdge = (edge: string) => {
  const [parentComponent, childComponent] = edge.split("\0");
  return { parentComponent, childComponent };
};

const getSubtreeComponentEdges = (
  root: Instance,
  instancesById: ReadonlyMap<Instance["id"], Instance>
) => {
  const edges = new Set<string>();
  const visit = (instance: Instance) => {
    for (const child of instance.children) {
      if (child.type !== "id") {
        continue;
      }
      const childInstance = instancesById.get(child.value);
      if (childInstance === undefined) {
        continue;
      }
      edges.add(
        createComponentEdge(instance.component, childInstance.component)
      );
      visit(childInstance);
    }
  };
  visit(root);
  return edges;
};

export const getTemplateRequiredStructure = (
  component: Instance["component"],
  templates: ComponentTemplateRegistry
) => {
  const template = templates.get(component)?.template;
  if (template === undefined) {
    return { parts: [], edges: [] };
  }
  const templateInstancesById = new Map(
    template.instances.map((instance) => [instance.id, instance])
  );
  const requiredParts = new Set<Instance["component"]>();
  const requiredEdges = new Set<string>();
  for (const child of template.children) {
    if (child.type !== "id") {
      continue;
    }
    const rootInstance = templateInstancesById.get(child.value);
    if (rootInstance?.component !== component) {
      continue;
    }
    for (const edge of getSubtreeComponentEdges(
      rootInstance,
      templateInstancesById
    )) {
      const [, childComponent] = edge.split("\0");
      if (
        componentMetas.get(childComponent)?.contentModel?.category === "none"
      ) {
        requiredEdges.add(edge);
      }
    }
    for (const subtreeComponent of getSubtreeComponents(
      rootInstance,
      templateInstancesById
    )) {
      if (subtreeComponent === component) {
        continue;
      }
      if (
        componentMetas.get(subtreeComponent)?.contentModel?.category === "none"
      ) {
        requiredParts.add(subtreeComponent);
      }
    }
  }
  return {
    parts: Array.from(requiredParts),
    edges: Array.from(requiredEdges),
  };
};

const createInsertFragmentMutation = <
  Details extends Record<string, unknown> = Record<string, never>,
>({
  state,
  parentInstanceId,
  fragment,
  templates,
  mode = "append",
  insertIndex: explicitInsertIndex,
  conflictResolution,
  contentMode = false,
  additionalAvailableVariables = [],
  getResultDetails,
  context,
}: {
  state: ComponentInsertState;
  parentInstanceId: Instance["id"];
  fragment: WebstudioFragment;
  templates: ComponentTemplateRegistry;
  mode?: z.infer<typeof instanceInsertModeInput>;
  insertIndex?: z.infer<typeof insertIndexInput>;
  conflictResolution?: ConflictResolution;
  contentMode?: boolean;
  additionalAvailableVariables?: DataSource[];
  getResultDetails?: (ids: {
    newInstanceIds: Map<string, string>;
    newDataSourceIds: Map<string, string>;
  }) => Details;
  context: BuilderRuntimeContext;
}) => {
  const mutationState = getRequiredComponentInsertState(state);
  const originalParent = mutationState.instances.get(parentInstanceId);
  if (originalParent === undefined) {
    return throwBuilderRuntimeError("NOT_FOUND", "Instance not found");
  }

  const page = getInsertionPage(mutationState, originalParent);
  for (const instance of fragment.instances) {
    validateFragmentComponent({
      instance,
      templates,
      page,
    });
  }

  const nextData = cloneFragmentData(mutationState);
  const normalizedSlotDropTarget = getSlotFragmentDropTargetMutable(
    nextData.instances,
    { parentSelector: [originalParent.id], position: "end" },
    context.createId
  );
  const parent =
    normalizedSlotDropTarget === undefined
      ? originalParent
      : nextData.instances.get(normalizedSlotDropTarget.parentSelector[0]);
  if (parent === undefined) {
    return throwBuilderRuntimeError("NOT_FOUND", "Instance not found");
  }
  const parentChildren = parent.children ?? [];
  const insertIndex =
    mode === "replace"
      ? 0
      : mode === "prepend"
        ? 0
        : (explicitInsertIndex ?? parentChildren.length);
  if (insertIndex > parentChildren.length) {
    return throwBuilderRuntimeError(
      "BAD_REQUEST",
      "Insert index is outside parent children"
    );
  }

  const { newInstanceIds, newDataSourceIds, didMergeBreakpointsDueToLimit } =
    insertWebstudioFragmentCopy({
      data: nextData,
      fragment,
      availableVariables: [
        ...findAvailableVariables({
          startingInstanceId: originalParent.id,
          instances: mutationState.instances,
          dataSources: mutationState.dataSources,
        }),
        ...additionalAvailableVariables,
      ],
      projectId: context.projectId ?? "",
      conflictResolution,
      createId: context.createId,
      metas: componentMetas,
      contentModeCopyableProp: isFragmentContentModeCopyableProp,
      contentMode,
    });
  for (const instanceId of newInstanceIds.values()) {
    if (
      instanceId !== ROOT_INSTANCE_ID &&
      mutationState.instances.has(instanceId)
    ) {
      return throwBuilderRuntimeError(
        "CONFLICT",
        `Generated instance id "${instanceId}" already exists`
      );
    }
  }
  const insertedChildren: Instance["children"] = fragment.children.map(
    (child) => {
      if (child.type === "id") {
        return createInstanceChild(
          newInstanceIds.get(child.value) ?? child.value
        );
      }
      return child;
    }
  );
  const createResult = (
    parentInstanceId: string,
    removedInstanceIds: string[]
  ): ComponentInsertResult & Details =>
    ({
      instanceIds: Array.from(newInstanceIds.values()).filter(
        (instanceId) =>
          instanceId !== ROOT_INSTANCE_ID &&
          mutationState.instances.has(instanceId) === false
      ),
      rootInstanceIds: insertedChildren.flatMap((child) =>
        child.type === "id" ? [child.value] : []
      ),
      removedInstanceIds,
      parentInstanceId,
      ...(getResultDetails?.({ newInstanceIds, newDataSourceIds }) ??
        ({} as Details)),
      ...(didMergeBreakpointsDueToLimit
        ? { didMergeBreakpointsDueToLimit: true as const }
        : {}),
    }) as ComponentInsertResult & Details;

  if (normalizedSlotDropTarget !== undefined) {
    if (mode === "replace") {
      return throwBuilderRuntimeError(
        "BAD_REQUEST",
        'Insert mode "replace" is not supported for Slot content'
      );
    }
    if (mode === "prepend") {
      parent.children.splice(0, 0, ...insertedChildren);
    } else {
      parent.children.splice(insertIndex, 0, ...insertedChildren);
    }
    const insertPayload = createFragmentPayload({
      before: mutationState,
      after: nextData,
      instancePatches: createRecordUpsertPatches({
        before: mutationState.instances,
        after: nextData.instances,
      }),
    });
    return createRuntimeMutation({
      payload: insertPayload,
      result: createResult(parent.id, []),
      invalidatesNamespaces: componentInsertNamespaces,
    });
  }

  const { payload: replacementPayload, replacedInstanceIds } =
    createInstanceAppendPayload({
      parent,
      instances: mutationState.instances,
      createdInstances: [],
      insertIndex,
      mode,
      props: mutationState.props.values(),
      dataSources: mutationState.dataSources.values(),
      styleSources: mutationState.styleSources.values(),
      styleSourceSelections: mutationState.styleSourceSelections.values(),
      styles: mutationState.styles.values(),
    });
  const insertPayload = createFragmentInsertPayload({
    before: mutationState,
    after: nextData,
    parent,
    insertIndex,
    insertedChildren,
  });
  return createRuntimeMutation({
    payload: compactBuilderPatchPayload([
      ...replacementPayload,
      ...insertPayload,
    ]),
    result: createResult(parent.id, replacedInstanceIds),
    invalidatesNamespaces: componentInsertNamespaces,
  });
};

export const insertComponent = (
  state: ComponentInsertState,
  input: z.infer<typeof insertComponentInput>,
  context: BuilderRuntimeContext
) => {
  const mutationState = getRequiredComponentInsertState(state);
  const parent = mutationState.instances.get(input.parentInstanceId);
  if (parent === undefined) {
    return throwBuilderRuntimeError("NOT_FOUND", "Instance not found");
  }

  const templates = getComponentTemplates();
  const template = templates.get(input.component);
  const meta = componentMetas.get(input.component);
  const unknownCoreComponentError = getUnknownCoreComponentError({
    component: input.component,
    templates,
  });
  if (unknownCoreComponentError !== undefined) {
    return throwBuilderRuntimeError("BAD_REQUEST", unknownCoreComponentError);
  }
  const insertCategory = template?.category ?? meta?.category;
  const page = getInsertionPage(mutationState, parent);
  if (
    isComponentAvailableForDocumentType({
      component: input.component,
      category: insertCategory,
      documentType: page.meta.documentType ?? "html",
    }) === false
  ) {
    if (insertCategory === "xml") {
      return throwBuilderRuntimeError(
        "BAD_REQUEST",
        `XML component "${input.component}" can only be inserted on pages with document type "xml". Change the page document type in page settings before inserting XML components.`
      );
    }
    return throwBuilderRuntimeError(
      "BAD_REQUEST",
      `Component "${input.component}" is not available for pages with document type "${page.meta.documentType ?? "html"}". Change the page document type in page settings or choose an available component.`
    );
  }
  if (input.component === elementComponent && input.tag === undefined) {
    return throwBuilderRuntimeError(
      "BAD_REQUEST",
      'Component "ws:element" requires "tag", for example { "component": "ws:element", "tag": "section" }. Use a Webstudio component such as "Box" when you do not need a specific HTML tag.'
    );
  }
  if (input.component !== elementComponent && input.tag !== undefined) {
    return throwBuilderRuntimeError(
      "BAD_REQUEST",
      `"tag" can only be used with component "ws:element"; remove "tag" or use component "ws:element".`
    );
  }

  const fragment = createComponentTemplateFragment({
    component: input.component,
    templates,
    getFallbackError: getStandaloneInsertError,
    createId: context.createId,
  });
  if (input.component === elementComponent) {
    for (const instance of fragment.instances) {
      if (instance.component === elementComponent) {
        instance.tag = input.tag;
      }
    }
  }
  return createInsertFragmentMutation({
    state,
    parentInstanceId: input.parentInstanceId,
    fragment,
    templates,
    mode: input.mode,
    insertIndex: input.insertIndex,
    context,
  });
};

export const insertCollection = (
  state: ComponentInsertState,
  input: z.infer<typeof insertCollectionInput>,
  context: BuilderRuntimeContext
) => {
  const mutationState = getRequiredComponentInsertState(state);
  if (mutationState.instances.has(input.parentInstanceId) === false) {
    return throwBuilderRuntimeError("NOT_FOUND", "Instance not found");
  }
  const templates = getComponentTemplates();
  const collection = createCollectionFragment({
    state: mutationState,
    input,
    templates,
  });
  const getMappedId = (ids: Map<string, string>, sourceId: string) => {
    const id = ids.get(sourceId);
    if (id === undefined) {
      return throwBuilderRuntimeError(
        "CONFLICT",
        `Collection insertion did not map generated id "${sourceId}".`
      );
    }
    return id;
  };
  return createInsertFragmentMutation<
    Omit<InsertCollectionResult, keyof ComponentInsertResult>
  >({
    state,
    parentInstanceId: input.parentInstanceId,
    fragment: collection.fragment,
    templates,
    mode: input.mode,
    insertIndex: input.insertIndex,
    additionalAvailableVariables: collection.parameterDataSources,
    getResultDetails: ({ newInstanceIds, newDataSourceIds }) => ({
      collectionInstanceId: getMappedId(
        newInstanceIds,
        collection.collectionInstanceId
      ),
      itemRootInstanceId: getMappedId(
        newInstanceIds,
        collection.itemRootInstanceId
      ),
      itemParameterId: getMappedId(
        newDataSourceIds,
        collection.itemParameterId
      ),
      itemKeyParameterId: getMappedId(
        newDataSourceIds,
        collection.itemKeyParameterId
      ),
    }),
    context,
  });
};

const createInsertTokenFragmentMutation = ({
  state,
  fragment,
  conflictResolution,
  context,
}: {
  state: ComponentInsertState;
  fragment: WebstudioFragment;
  conflictResolution?: ConflictResolution;
  context: BuilderRuntimeContext;
}) => {
  const mutationState = getRequiredComponentInsertState(state);
  const nextData = cloneFragmentData(mutationState);
  const { didMergeBreakpointsDueToLimit } = insertWebstudioFragmentCopy({
    data: nextData,
    fragment,
    availableVariables: [],
    projectId: context.projectId ?? "",
    conflictResolution,
    createId: context.createId,
  });
  return createRuntimeMutation({
    payload: createTokenFragmentInsertPayload({
      before: mutationState,
      after: nextData,
    }),
    result: {
      instanceIds: [],
      rootInstanceIds: [],
      removedInstanceIds: [],
      ...(didMergeBreakpointsDueToLimit
        ? { didMergeBreakpointsDueToLimit }
        : {}),
    },
    invalidatesNamespaces: componentInsertNamespaces,
  });
};

export const insertFragment = (
  state: ComponentInsertState,
  input: z.infer<typeof insertFragmentInput>,
  context: BuilderRuntimeContext
): BuilderRuntimeMutation<FragmentInsertResult> => {
  if (input.fragment.children.length === 0) {
    return createInsertTokenFragmentMutation({
      state,
      fragment: input.fragment,
      conflictResolution: input.conflictResolution,
      context,
    });
  }
  if (input.parentInstanceId === undefined) {
    return throwBuilderRuntimeError(
      "BAD_REQUEST",
      "Parent instance is required when inserting a fragment with children"
    );
  }
  const templates = getComponentTemplates();
  return createInsertFragmentMutation({
    state,
    parentInstanceId: input.parentInstanceId,
    fragment: input.fragment,
    templates,
    mode: input.mode,
    insertIndex: input.insertIndex,
    conflictResolution: input.conflictResolution,
    contentMode: input.contentMode,
    context,
  });
};
