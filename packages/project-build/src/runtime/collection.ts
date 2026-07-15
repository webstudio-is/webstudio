import {
  collectionComponent,
  webstudioFragment,
  type DataSource,
  type Instance,
  type Prop,
  type WebstudioData,
  type WebstudioFragment,
} from "@webstudio-is/sdk";
import { z } from "zod";
import { componentInsertResult } from "./component-insert-contract";
import type { ComponentTemplateRegistry } from "./component-template";
import { bindExpressionToInstanceScope } from "./data";
import { throwBuilderRuntimeError } from "./errors";
import { insertIndexInput, instanceInsertModeInput } from "./instances";

const collectionDataInput = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("json"),
    value: z.union([z.array(z.unknown()), z.record(z.string(), z.unknown())]),
  }),
  z.object({
    type: z.literal("expression"),
    value: z
      .string()
      .min(1)
      .describe(
        'Expression resolving to the complete array or object, for example "Posts.data.items".'
      ),
  }),
]);

export const insertCollectionInput = z.object({
  parentInstanceId: z.string(),
  data: collectionDataInput.describe(
    "Complete iterable for the Collection. Do not pass one indexed item."
  ),
  itemFragment: webstudioFragment.describe(
    "One structured repeated-item fragment. Descendant expressions may reference collectionItem and collectionItemKey."
  ),
  mode: instanceInsertModeInput.optional(),
  insertIndex: insertIndexInput.optional(),
});

export const insertCollectionResult = componentInsertResult.extend({
  collectionInstanceId: z.string(),
  itemRootInstanceId: z.string(),
  itemParameterId: z.string(),
  itemKeyParameterId: z.string(),
});

export type InsertCollectionResult = z.infer<typeof insertCollectionResult>;

const assertNoIdCollision = (
  label: string,
  generatedRecords: ReadonlyArray<{ id: string }>,
  itemRecords: ReadonlyArray<{ id: string }>
) => {
  const generatedIds = new Set(generatedRecords.map((record) => record.id));
  const collision = itemRecords.find((record) => generatedIds.has(record.id));
  if (collision !== undefined) {
    return throwBuilderRuntimeError(
      "CONFLICT",
      `Collection item fragment ${label} id "${collision.id}" conflicts with the generated Collection template.`
    );
  }
};

const getItemRootInstanceId = (fragment: WebstudioFragment) => {
  const root = fragment.children[0];
  if (
    fragment.children.length !== 1 ||
    root?.type !== "id" ||
    fragment.instances.some((instance) => instance.id === root.value) === false
  ) {
    return throwBuilderRuntimeError(
      "BAD_REQUEST",
      "Collection itemFragment must contain exactly one root instance. Wrap repeated sibling elements in one ws:element or component."
    );
  }
  const instances = new Map(
    fragment.instances.map((instance) => [instance.id, instance])
  );
  if (instances.size !== fragment.instances.length) {
    return throwBuilderRuntimeError(
      "BAD_REQUEST",
      "Collection itemFragment instance ids must be unique."
    );
  }
  const reachableIds = new Set<string>();
  const visitingIds = new Set<string>();
  const visit = (instanceId: string) => {
    if (visitingIds.has(instanceId)) {
      return throwBuilderRuntimeError(
        "BAD_REQUEST",
        "Collection itemFragment instance tree must not contain a cycle."
      );
    }
    if (reachableIds.has(instanceId)) {
      return;
    }
    const instance = instances.get(instanceId);
    if (instance === undefined) {
      return throwBuilderRuntimeError(
        "BAD_REQUEST",
        `Collection itemFragment references missing instance "${instanceId}".`
      );
    }
    visitingIds.add(instanceId);
    for (const child of instance.children) {
      if (child.type === "id") {
        visit(child.value);
      }
    }
    visitingIds.delete(instanceId);
    reachableIds.add(instanceId);
  };
  visit(root.value);
  if (reachableIds.size !== instances.size) {
    return throwBuilderRuntimeError(
      "BAD_REQUEST",
      "Collection itemFragment must not contain instances disconnected from its root."
    );
  }
  return root.value;
};

const getCollectionParameter = ({
  name,
  collectionInstance,
  collectionProps,
  dataSources,
}: {
  name: "item" | "itemKey";
  collectionInstance: Instance;
  collectionProps: Prop[];
  dataSources: DataSource[];
}) => {
  const prop = collectionProps.find(
    (candidate): candidate is Extract<Prop, { type: "parameter" }> =>
      candidate.name === name && candidate.type === "parameter"
  );
  const dataSource = dataSources.find(
    (candidate): candidate is Extract<DataSource, { type: "parameter" }> =>
      candidate.id === prop?.value &&
      candidate.type === "parameter" &&
      candidate.scopeInstanceId === collectionInstance.id
  );
  if (prop === undefined || dataSource === undefined) {
    return throwBuilderRuntimeError(
      "BAD_REQUEST",
      `Collection component template is missing its ${name} parameter.`
    );
  }
  return { prop, dataSource };
};

export const createCollectionFragment = ({
  state,
  input,
  templates,
}: {
  state: Pick<WebstudioData, "instances" | "dataSources">;
  input: z.infer<typeof insertCollectionInput>;
  templates: ComponentTemplateRegistry;
}) => {
  const itemRootInstanceId = getItemRootInstanceId(input.itemFragment);
  for (const dataSource of input.itemFragment.dataSources) {
    if (
      dataSource.name === "collectionItem" ||
      dataSource.name === "collectionItemKey"
    ) {
      return throwBuilderRuntimeError(
        "BAD_REQUEST",
        `Collection itemFragment cannot declare reserved data source "${dataSource.name}".`
      );
    }
  }

  const template = structuredClone(
    templates.get(collectionComponent)?.template
  );
  const collectionChild = template?.children[0];
  if (template === undefined || collectionChild?.type !== "id") {
    return throwBuilderRuntimeError(
      "BAD_REQUEST",
      "Collection component template is unavailable."
    );
  }
  const collectionInstance = template.instances.find(
    (instance) => instance.id === collectionChild.value
  );
  if (collectionInstance === undefined) {
    return throwBuilderRuntimeError(
      "BAD_REQUEST",
      "Collection component template root is unavailable."
    );
  }
  const collectionProps = template.props.filter(
    (prop) => prop.instanceId === collectionInstance.id
  );
  const item = getCollectionParameter({
    name: "item",
    collectionInstance,
    collectionProps,
    dataSources: template.dataSources,
  });
  const itemKey = getCollectionParameter({
    name: "itemKey",
    collectionInstance,
    collectionProps,
    dataSources: template.dataSources,
  });
  const dataProp = collectionProps.find((prop) => prop.name === "data");
  if (dataProp === undefined) {
    return throwBuilderRuntimeError(
      "BAD_REQUEST",
      "Collection component template is missing its data prop."
    );
  }
  const nextDataProp: Prop =
    input.data.type === "json"
      ? { ...dataProp, type: "json", value: input.data.value }
      : {
          ...dataProp,
          type: "expression",
          value: bindExpressionToInstanceScope({
            expression: input.data.value,
            instanceId: input.parentInstanceId,
            instances: state.instances,
            dataSources: state.dataSources,
          }),
        };
  const parameterDataSources = [item.dataSource, itemKey.dataSource];
  assertNoIdCollision(
    "instance",
    [collectionInstance],
    input.itemFragment.instances
  );
  assertNoIdCollision("prop", collectionProps, input.itemFragment.props);
  assertNoIdCollision(
    "data source",
    parameterDataSources,
    input.itemFragment.dataSources
  );

  return {
    fragment: {
      ...input.itemFragment,
      children: [{ type: "id", value: collectionInstance.id }],
      instances: [
        { ...collectionInstance, children: input.itemFragment.children },
        ...input.itemFragment.instances,
      ],
      props: [
        ...collectionProps.filter((prop) => prop.id !== dataProp.id),
        nextDataProp,
        ...input.itemFragment.props,
      ],
      dataSources: [...parameterDataSources, ...input.itemFragment.dataSources],
    } satisfies WebstudioFragment,
    collectionInstanceId: collectionInstance.id,
    itemRootInstanceId,
    itemParameterId: item.prop.value,
    itemKeyParameterId: itemKey.prop.value,
    parameterDataSources,
  };
};
