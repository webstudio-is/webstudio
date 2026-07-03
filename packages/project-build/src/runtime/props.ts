import { z } from "zod";
import {
  prop as propSchema,
  type Instance,
  type Prop,
} from "@webstudio-is/sdk";
import type { BuilderState } from "../state/builder-state";
import { throwBuilderRuntimeError } from "./errors";
import { getExpressionErrors } from "./expression-validation";
import { createRuntimeMutation } from "./mutation";

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
  return getExpressionErrors(String(value));
};

const addExpressionIssues = (
  context: z.RefinementCtx,
  errors: readonly string[],
  path: (string | number)[] = []
) => {
  for (const message of errors) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      message,
      path,
    });
  }
};

export const propValueInput = z
  .object({
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
  })
  .superRefine((value, context) => {
    addExpressionIssues(context, getPropValueErrors(value), ["value"]);
  });

export const propBindingInput = z
  .object({
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
  })
  .superRefine((value, context) => {
    addExpressionIssues(
      context,
      getPropValueErrors({
        type: value.binding.type,
        value: value.binding.value,
      }),
      ["binding", "value"]
    );
  });

export const propUpdatesInput = z.object({
  updates: z.array(propValueInput).min(1),
});

export const propBindingsInput = z.object({
  bindings: z.array(propBindingInput).min(1),
});

export const propDeletionsInput = z.object({
  deletions: z
    .array(z.object({ instanceId: z.string(), name: z.string() }))
    .min(1),
});

type ValidatedPropInputResult =
  | { success: true; prop: Prop }
  | { success: false; errors: string[] };

const createMissingId = (): Prop["id"] => {
  throw new Error("createId is required when propId is not provided.");
};

export const createValidatedPropValueFromInput = (
  value: z.infer<typeof propValueInput>,
  createId: () => Prop["id"] = createMissingId
): ValidatedPropInputResult => {
  const errors = getPropValueErrors(value);
  if (errors.length > 0) {
    return { success: false, errors };
  }
  return {
    success: true,
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
  createId: () => Prop["id"] = createMissingId
): ValidatedPropInputResult => {
  const errors = getPropValueErrors({
    type: binding.binding.type,
    value: binding.binding.value,
  });
  if (errors.length > 0) {
    return { success: false, errors };
  }
  return {
    success: true,
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
  createId,
}: {
  nextIdById: Map<Instance["id"], Instance["id"]>;
  props: Iterable<Prop>;
  createId: () => Prop["id"];
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
}) => {
  const existingProps = Array.from(props);
  const removedPropIds = new Set<Prop["id"]>();
  const patches = nextProps.flatMap((nextProp) => {
    const existing =
      existingProps.find((prop) => prop.id === nextProp.id) ??
      findProp(existingProps, nextProp.instanceId, nextProp.name);
    const prop =
      existing === undefined ? nextProp : { ...nextProp, id: existing.id };
    const duplicateRemovals = existingProps
      .filter((existingProp) => existingProp.id !== prop.id)
      .filter((existingProp) => existingProp.instanceId === prop.instanceId)
      .filter((existingProp) => existingProp.name === prop.name)
      .flatMap((existingProp) => {
        if (removedPropIds.has(existingProp.id)) {
          return [];
        }
        removedPropIds.add(existingProp.id);
        return [
          {
            op: "remove" as const,
            path: [existingProp.id],
          },
        ];
      });
    return [
      ...duplicateRemovals,
      {
        op: existing === undefined ? ("add" as const) : ("replace" as const),
        path: [prop.id],
        value: prop,
      },
    ];
  });
  return {
    propIds: patches.flatMap((patch) =>
      patch.op === "remove" ? [] : [String(patch.path[0])]
    ),
    payload:
      patches.length === 0 ? [] : [{ namespace: "props" as const, patches }],
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
}) => {
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

export const createPropRenamePayload = ({
  props,
  renames,
}: {
  props: Iterable<Prop>;
  renames: Array<{
    propId: Prop["id"];
    name: Prop["name"];
    propIdPrefix?: string;
  }>;
}) => {
  const propById = new Map(Array.from(props, (prop) => [prop.id, prop]));
  const patches = renames.flatMap(({ propId, name, propIdPrefix }) => {
    const prop = propById.get(propId);
    if (prop === undefined) {
      return [];
    }
    const nextProp = {
      ...prop,
      id: propIdPrefix === undefined ? prop.id : `${propIdPrefix}:${name}`,
      name,
    };
    return [
      { op: "remove" as const, path: [prop.id] },
      { op: "add" as const, path: [nextProp.id], value: nextProp },
    ];
  });
  return {
    propIds: patches.flatMap((patch) =>
      patch.op === "remove" ? [] : [String(patch.path[0])]
    ),
    payload:
      patches.length === 0 ? [] : [{ namespace: "props" as const, patches }],
  };
};

const getRequiredPropState = (
  state: Pick<BuilderState, "instances" | "props">
) => {
  if (state.instances === undefined || state.props === undefined) {
    return throwBuilderRuntimeError(
      "BAD_REQUEST",
      "Instance or props namespace is missing"
    );
  }
  return { instances: state.instances, props: state.props };
};

const assertRuntimeInstance = (
  instances: Map<Instance["id"], Instance>,
  instanceId: Instance["id"]
) => {
  if (instances.has(instanceId) === false) {
    return throwBuilderRuntimeError("NOT_FOUND", "Instance not found");
  }
};

const throwPropErrors = (errors: string[]) =>
  throwBuilderRuntimeError("BAD_REQUEST", errors.join("\n"));

export const updateProps = (
  state: Pick<BuilderState, "instances" | "props">,
  input: z.infer<typeof propUpdatesInput>,
  context: { createId: () => string }
) => {
  const { instances, props } = getRequiredPropState(state);
  const nextProps = input.updates.map((update) => {
    assertRuntimeInstance(instances, update.instanceId);
    const existing = findProp(props.values(), update.instanceId, update.name);
    const nextProp = createValidatedPropValueFromInput(
      { ...update, propId: update.propId ?? existing?.id },
      context.createId
    );
    if (nextProp.success === false) {
      return throwPropErrors(nextProp.errors);
    }
    return nextProp.prop;
  });
  const { payload, propIds } = createPropUpsertPayload({
    props: props.values(),
    nextProps,
  });
  return createRuntimeMutation({
    payload,
    result: { propIds },
    invalidatesNamespaces: ["props"],
  });
};

export const bindProps = (
  state: Pick<BuilderState, "instances" | "props">,
  input: z.infer<typeof propBindingsInput>,
  context: { createId: () => string }
) => {
  const { instances, props } = getRequiredPropState(state);
  const nextProps = input.bindings.map((binding) => {
    assertRuntimeInstance(instances, binding.instanceId);
    const existing = findProp(props.values(), binding.instanceId, binding.name);
    const nextProp = createValidatedPropBindingFromInput(
      { ...binding, propId: binding.propId ?? existing?.id },
      context.createId
    );
    if (nextProp.success === false) {
      return throwPropErrors(nextProp.errors);
    }
    return nextProp.prop;
  });
  const { payload, propIds } = createPropUpsertPayload({
    props: props.values(),
    nextProps,
  });
  return createRuntimeMutation({
    payload,
    result: { propIds },
    invalidatesNamespaces: ["props"],
  });
};

export const deleteProps = (
  state: Pick<BuilderState, "instances" | "props">,
  input: z.infer<typeof propDeletionsInput>
) => {
  const { instances, props } = getRequiredPropState(state);
  const { missingInstanceId, payload, propIds } = createPropDeletePayload({
    instances,
    props: props.values(),
    deletions: input.deletions,
  });
  if (missingInstanceId !== undefined) {
    return throwBuilderRuntimeError("NOT_FOUND", "Instance not found");
  }
  return createRuntimeMutation({
    payload,
    result: { propIds },
    invalidatesNamespaces: ["props", "resources"],
  });
};
