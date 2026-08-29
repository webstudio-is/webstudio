import {
  blockBodyComponent,
  blockComponent,
  contentBlockDocumentProp,
  contentBlockSourceProp,
  createId,
  findContentBlockBodyContainers,
  findContentBlockTemplateContainers,
  isEqualContentBlockSource,
  parseContentBlockSourceProp,
  type ContentBlockSource,
  type Prop,
} from "@webstudio-is/sdk";
import type { BuilderPatchChange } from "../contracts/patch";
import type { BuilderState } from "../state/builder-state";
import { createInstanceDeletePayload } from "./instances";
import { mergeBuilderPatchChanges } from "./mutation";

export type PreparedContentBlockSourceLifecycle = Readonly<{
  action: "connect" | "switch" | "disconnect";
  projectPayload: readonly BuilderPatchChange[];
  requiresConfirmation: boolean;
}>;

const getBlockParts = (state: BuilderState, blockInstanceId: string) => {
  const block = state.instances?.get(blockInstanceId);
  if (block?.component !== blockComponent) {
    throw new Error(`Content Block "${blockInstanceId}" does not exist`);
  }
  const templateContainers = findContentBlockTemplateContainers({
    blockInstance: block,
    instances: state.instances ?? new Map(),
  });
  if (templateContainers.length !== 1) {
    throw new Error("Content Block must contain exactly one Templates list");
  }
  const [templateContainer] = templateContainers;
  const templateChild = {
    type: "id" as const,
    value: templateContainer.id,
  };
  const bodyContainers = findContentBlockBodyContainers({
    blockInstance: block,
    instances: state.instances ?? new Map(),
  });
  if (bodyContainers.length > 1) {
    throw new Error("Content Block must contain at most one Body outlet");
  }
  const bodyContainer = bodyContainers[0] ?? block;
  return {
    block,
    bodyContainer,
    templateChild,
    bodyChildren:
      bodyContainer === block
        ? block.children.filter(
            (child) =>
              child.type !== "id" || child.value !== templateContainer.id
          )
        : bodyContainer.children,
  };
};

const getSourceProp = (state: BuilderState, blockInstanceId: string) => {
  const sourceProps = Array.from(state.props?.values() ?? []).filter(
    (prop) =>
      prop.instanceId === blockInstanceId &&
      prop.name === contentBlockSourceProp
  );
  if (sourceProps.length > 1) {
    throw new Error("Content Block has multiple source props");
  }
  return sourceProps[0];
};

const toSourceProp = ({
  id,
  blockInstanceId,
  source,
}: {
  id: string;
  blockInstanceId: string;
  source: ContentBlockSource;
}): Prop =>
  source.type === "asset"
    ? {
        id,
        instanceId: blockInstanceId,
        name: contentBlockSourceProp,
        type: "asset",
        value: source.assetId,
      }
    : {
        id,
        instanceId: blockInstanceId,
        name: contentBlockSourceProp,
        type: "expression",
        value: source.value,
        mode: "read",
      };

const createSourcePayload = ({
  state,
  blockInstanceId,
  source,
}: {
  state: BuilderState;
  blockInstanceId: string;
  source?: ContentBlockSource;
}): BuilderPatchChange[] => {
  const existing = getSourceProp(state, blockInstanceId);
  if (source === undefined) {
    return existing === undefined
      ? []
      : [
          {
            namespace: "props",
            patches: [{ op: "remove", path: [existing.id] }],
          },
        ];
  }
  const next = toSourceProp({
    id: existing?.id ?? createId("nano"),
    blockInstanceId,
    source,
  });
  if (
    existing !== undefined &&
    isEqualContentBlockSource(parseContentBlockSourceProp(existing), source)
  ) {
    return [];
  }
  return [
    {
      namespace: "props",
      patches: [
        existing === undefined
          ? { op: "add", path: [next.id], value: next }
          : { op: "replace", path: [existing.id], value: next },
      ],
    },
  ];
};

const createDocumentParameterPayload = (
  state: BuilderState,
  blockInstanceId: string
): BuilderPatchChange[] => {
  const existing = Array.from(state.props?.values() ?? []).find(
    (prop) =>
      prop.instanceId === blockInstanceId &&
      prop.name === contentBlockDocumentProp
  );
  if (existing?.type === "parameter") {
    return [];
  }
  if (existing !== undefined) {
    throw new Error("Content Block document prop must be a parameter");
  }
  const dataSourceId = createId("nano");
  const propId = createId("nano");
  return [
    {
      namespace: "dataSources",
      patches: [
        {
          op: "add",
          path: [dataSourceId],
          value: {
            type: "parameter",
            id: dataSourceId,
            scopeInstanceId: blockInstanceId,
            name: contentBlockDocumentProp,
          },
        },
      ],
    },
    {
      namespace: "props",
      patches: [
        {
          op: "add",
          path: [propId],
          value: {
            id: propId,
            instanceId: blockInstanceId,
            name: contentBlockDocumentProp,
            type: "parameter",
            value: dataSourceId,
          },
        },
      ],
    },
  ];
};

const createContentBlockBodyRemoval = ({
  state,
  blockInstanceId,
}: {
  state: BuilderState;
  blockInstanceId: string;
}) => {
  const { block, bodyContainer, templateChild, bodyChildren } = getBlockParts(
    state,
    blockInstanceId
  );
  const rootIds = bodyChildren.flatMap((child) =>
    child.type === "id" ? [child.value] : []
  );
  const cleanup =
    rootIds.length === 0
      ? []
      : createInstanceDeletePayload({
          instances: state.instances ?? new Map(),
          instanceIds: rootIds,
          props: state.props?.values() ?? [],
          dataSources: state.dataSources?.values() ?? [],
          styleSources: state.styleSources?.values() ?? [],
          styleSourceSelections: state.styleSourceSelections?.values() ?? [],
          styles: state.styles?.values() ?? [],
        });
  if (cleanup !== undefined && "errors" in cleanup && cleanup.errors.length) {
    throw new Error("Content Block body is not a valid instance tree");
  }
  const bodyInstanceId =
    bodyContainer === block ? createId("nano") : bodyContainer.id;
  const createBodyPayload: BuilderPatchChange[] =
    bodyContainer === block
      ? [
          {
            namespace: "instances",
            patches: [
              {
                op: "add",
                path: [bodyInstanceId],
                value: {
                  type: "instance",
                  id: bodyInstanceId,
                  component: blockBodyComponent,
                  children: [],
                },
              },
            ],
          },
        ]
      : [];
  return {
    hasBody: bodyChildren.length > 0,
    projectPayload: mergeBuilderPatchChanges(
      cleanup === undefined || Array.isArray(cleanup) ? [] : cleanup.payload,
      createBodyPayload,
      [
        {
          namespace: "instances",
          patches: [
            {
              op: "replace",
              path: [bodyContainer.id, "children"],
              value:
                bodyContainer === block
                  ? [templateChild, { type: "id", value: bodyInstanceId }]
                  : [],
            },
          ],
        },
      ]
    ),
  };
};

export const prepareContentBlockConnect = ({
  state,
  blockInstanceId,
  source,
}: {
  state: BuilderState;
  blockInstanceId: string;
  source: ContentBlockSource;
}): PreparedContentBlockSourceLifecycle => {
  const existing = getSourceProp(state, blockInstanceId);
  if (
    existing !== undefined &&
    isEqualContentBlockSource(parseContentBlockSourceProp(existing), source) ===
      false
  ) {
    throw new Error("Content Block is already connected; use switch instead");
  }
  const removal = createContentBlockBodyRemoval({ state, blockInstanceId });
  return {
    action: "connect",
    projectPayload: mergeBuilderPatchChanges(
      removal.projectPayload,
      createSourcePayload({
        state,
        blockInstanceId,
        source,
      }),
      createDocumentParameterPayload(state, blockInstanceId)
    ),
    requiresConfirmation: existing === undefined && removal.hasBody,
  };
};

export const prepareContentBlockSwitch = ({
  state,
  blockInstanceId,
  source,
}: {
  state: BuilderState;
  blockInstanceId: string;
  source: ContentBlockSource;
}): PreparedContentBlockSourceLifecycle => {
  getBlockParts(state, blockInstanceId);
  if (getSourceProp(state, blockInstanceId) === undefined) {
    throw new Error("Content Block is not connected; use connect instead");
  }
  return {
    action: "switch",
    projectPayload: mergeBuilderPatchChanges(
      createSourcePayload({
        state,
        blockInstanceId,
        source,
      }),
      createDocumentParameterPayload(state, blockInstanceId)
    ),
    requiresConfirmation: false,
  };
};

export const prepareContentBlockDisconnect = ({
  state,
  blockInstanceId,
}: {
  state: BuilderState;
  blockInstanceId: string;
}): PreparedContentBlockSourceLifecycle => {
  const source = getSourceProp(state, blockInstanceId);
  if (source === undefined) {
    return {
      action: "disconnect",
      projectPayload: [],
      requiresConfirmation: false,
    };
  }
  getBlockParts(state, blockInstanceId);
  return {
    action: "disconnect",
    projectPayload: createSourcePayload({
      state,
      blockInstanceId,
    }),
    requiresConfirmation: false,
  };
};
