import { nanoid } from "nanoid";
import { z } from "zod";
import {
  prop as propSchema,
  type Instance,
  type Prop,
} from "@webstudio-is/sdk";
import type { buildPatchTransaction } from "@webstudio-is/protocol";
import { compactBuildPatchPayload } from "./build-patch-utils";
import { getExpressionErrorMessages } from "./expression-validation";

export const findProp = (
  props: Iterable<Prop>,
  instanceId: Instance["id"],
  name: Prop["name"]
) => {
  for (const prop of props) {
    if (prop.instanceId === instanceId && prop.name === name) {
      return prop;
    }
  }
};

export const createPropValue = ({
  id,
  instanceId,
  name,
  type,
  value,
  required,
}: {
  id: Prop["id"];
  instanceId: Instance["id"];
  name: Prop["name"];
  type: Prop["type"];
  value: unknown;
  required?: boolean;
}): Prop =>
  propSchema.parse({
    id,
    instanceId,
    name,
    type,
    value,
    required,
  });

export const createPropBindingFromInput = ({
  id,
  instanceId,
  name,
  binding,
}: {
  id: Prop["id"];
  instanceId: Instance["id"];
  name: Prop["name"];
  binding: Pick<Prop, "type" | "value">;
}): Prop =>
  createPropValue({
    id,
    instanceId,
    name,
    type: binding.type,
    value: binding.value,
  });

export const propValueInput = z.object({
  propId: z.string().optional(),
  instanceId: z.string(),
  name: z.string(),
  type: z.enum([
    "number",
    "string",
    "boolean",
    "json",
    "asset",
    "page",
    "string[]",
    "parameter",
    "resource",
    "expression",
    "action",
    "animationAction",
  ]),
  value: z.unknown(),
  required: z.boolean().optional(),
});

export const propBindingInput = z.object({
  propId: z.string().optional(),
  instanceId: z.string(),
  name: z.string(),
  binding: z.discriminatedUnion("type", [
    z.object({ type: z.literal("expression"), value: z.string() }),
    z.object({ type: z.literal("parameter"), value: z.string() }),
    z.object({ type: z.literal("resource"), value: z.string() }),
    z.object({
      type: z.literal("action"),
      value: z.array(
        z.object({
          type: z.literal("execute"),
          args: z.array(z.string()),
          code: z.string(),
        })
      ),
    }),
  ]),
});

export const getPropValueErrors = ({
  type,
  value,
}: {
  type: Prop["type"];
  value?: unknown;
}) => {
  if (type !== "expression") {
    return [];
  }
  return getExpressionErrorMessages({ expression: String(value) });
};

type ValidatedPropInputResult =
  | { success: true; prop: Prop }
  | { success: false; errors: string[] };

export const createValidatedPropValueFromInput = (
  value: z.infer<typeof propValueInput>,
  createId: () => Prop["id"] = nanoid
): ValidatedPropInputResult => {
  const errors = getPropValueErrors(value);
  if (errors.length > 0) {
    return { success: false as const, errors };
  }
  return {
    success: true as const,
    prop: createPropValue({
      id: value.propId ?? createId(),
      instanceId: value.instanceId,
      name: value.name,
      type: value.type,
      value: value.value,
      required: value.required,
    }),
  };
};

export const createValidatedPropBindingFromInput = (
  binding: z.infer<typeof propBindingInput>,
  createId: () => Prop["id"] = nanoid
): ValidatedPropInputResult => {
  const errors = getPropValueErrors({
    type: binding.binding.type,
    value: binding.binding.value,
  });
  if (errors.length > 0) {
    return { success: false as const, errors };
  }
  return {
    success: true as const,
    prop: createPropBindingFromInput({
      id: binding.propId ?? createId(),
      instanceId: binding.instanceId,
      name: binding.name,
      binding: binding.binding,
    }),
  };
};

export const clonePropForInstance = ({
  prop,
  propId,
  instanceId,
}: {
  prop: Prop;
  propId: Prop["id"];
  instanceId: Instance["id"];
}): Prop => ({
  ...prop,
  id: propId,
  instanceId,
});

export const createPropClonePatches = ({
  nextIdById,
  props,
  createId = nanoid,
}: {
  nextIdById: Map<Instance["id"], Instance["id"]>;
  props: Iterable<Prop>;
  createId?: () => Prop["id"];
}) =>
  Array.from(props).flatMap((prop) => {
    const nextInstanceId = nextIdById.get(prop.instanceId);
    if (nextInstanceId === undefined) {
      return [];
    }
    const nextProp = clonePropForInstance({
      prop,
      propId: createId(),
      instanceId: nextInstanceId,
    });
    return [{ op: "add" as const, path: [nextProp.id], value: nextProp }];
  });

export const createPropUpsertPayload = ({
  props,
  nextProps,
}: {
  props: Iterable<Prop>;
  nextProps: Prop[];
}): {
  propIds: Prop["id"][];
  payload: z.infer<typeof buildPatchTransaction>["payload"];
} => {
  const patches = nextProps.map((nextProp) => {
    const existing = findProp(props, nextProp.instanceId, nextProp.name);
    const prop =
      existing === undefined ? nextProp : { ...nextProp, id: existing.id };
    return {
      op: existing === undefined ? ("add" as const) : ("replace" as const),
      path: [prop.id],
      value: prop,
    };
  });
  return {
    propIds: patches.map((patch) => String(patch.path[0])),
    payload: compactBuildPatchPayload([{ namespace: "props", patches }]),
  };
};

export const getPropIdsToDelete = ({
  instanceComponent,
  instanceProps,
  propName,
}: {
  instanceComponent: string | undefined;
  instanceProps: Map<Prop["name"], Prop>;
  propName: Prop["name"];
}) => {
  const propIds = new Set<Prop["id"]>();
  const prop = instanceProps.get(propName);
  if (prop) {
    propIds.add(prop.id);
  }
  if (instanceComponent === "Image" && propName === "src") {
    const widthProp = instanceProps.get("width");
    if (widthProp) {
      propIds.add(widthProp.id);
    }
    const heightProp = instanceProps.get("height");
    if (heightProp) {
      propIds.add(heightProp.id);
    }
  }
  return propIds;
};

export const getPropDeletePlan = ({
  instance,
  props,
  propName,
}: {
  instance: Instance;
  props: Iterable<Prop>;
  propName: Prop["name"];
}) => {
  const instanceProps = new Map<Prop["name"], Prop>();
  for (const prop of props) {
    if (prop.instanceId === instance.id) {
      instanceProps.set(prop.name, prop);
    }
  }
  const propIds = getPropIdsToDelete({
    instanceComponent: instance.component,
    instanceProps,
    propName,
  });
  const propById = new Map(
    Array.from(instanceProps.values(), (prop) => [prop.id, prop])
  );
  const resourceIds = new Set<string>();
  for (const propId of propIds) {
    const prop = propById.get(propId);
    if (prop?.type === "resource") {
      resourceIds.add(prop.value);
    }
  }
  return { propIds, resourceIds };
};

export const createPropDeletePayload = ({
  deletions,
  instances,
  props,
}: {
  deletions: Array<{ instanceId: Instance["id"]; name: Prop["name"] }>;
  instances: Map<Instance["id"], Instance>;
  props: Iterable<Prop>;
}): {
  missingInstanceId?: Instance["id"];
  propIds: Prop["id"][];
  resourceIds: string[];
  payload: z.infer<typeof buildPatchTransaction>["payload"];
} => {
  const propIds = new Set<string>();
  const resourceIds = new Set<string>();
  for (const deletion of deletions) {
    const instance = instances.get(deletion.instanceId);
    if (instance === undefined) {
      return {
        missingInstanceId: deletion.instanceId,
        propIds: [],
        resourceIds: [],
        payload: [],
      };
    }
    const plan = getPropDeletePlan({
      instance,
      props,
      propName: deletion.name,
    });
    for (const propId of plan.propIds) {
      propIds.add(propId);
    }
    for (const resourceId of plan.resourceIds) {
      resourceIds.add(resourceId);
    }
  }
  const propIdList = Array.from(propIds);
  const resourceIdList = Array.from(resourceIds);
  return {
    propIds: propIdList,
    resourceIds: resourceIdList,
    payload: [
      ...(propIdList.length === 0
        ? []
        : [
            {
              namespace: "props" as const,
              patches: propIdList.map((propId) => ({
                op: "remove" as const,
                path: [propId],
              })),
            },
          ]),
      ...(resourceIdList.length === 0
        ? []
        : [
            {
              namespace: "resources" as const,
              patches: resourceIdList.map((resourceId) => ({
                op: "remove" as const,
                path: [resourceId],
              })),
            },
          ]),
    ],
  };
};
