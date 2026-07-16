import { z } from "zod";
import {
  prop as propSchema,
  type Instance,
  type Prop,
  type PropMeta,
} from "@webstudio-is/sdk";
import { validateJsonLd } from "@webstudio-is/sdk/runtime";
import type { BuilderState } from "../state/builder-state";
import { addZodValidationIssue, throwBuilderRuntimeError } from "./errors";
import { replaceTextValue } from "./text-replacement";
import {
  getExpressionErrorMessages,
  getExpressionErrors,
} from "./expression-validation";
import { runtimeGeneratedIdInput } from "./generated-id-input";
import { validateHtmlEmbedCode } from "./html";
import { createRuntimeMutation } from "./mutation";
import { isDynamicPropType } from "./accessibility-analysis";

export const showAttributeMeta: PropMeta = {
  label: "Show",
  required: false,
  control: "boolean",
  type: "boolean",
  defaultValue: true,
  description:
    "Removes the instance from the DOM. Breakpoints have no effect on this setting.",
};

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

export const listPropExpressions = ({
  type,
  value,
}: {
  type: Prop["type"];
  value: unknown;
}) => {
  if (type === "expression" && typeof value === "string") {
    return [
      {
        expression: value,
        allowAssignment: false,
        variables: [] as string[],
        path: [] as string[],
      },
    ];
  }
  if (type !== "action" || Array.isArray(value) === false) {
    return [];
  }
  const actions = value as Extract<Prop, { type: "action" }>["value"];
  return actions.map((action, index) => ({
    expression: action.code,
    allowAssignment: true,
    variables: action.args,
    path: [String(index), "code"],
  }));
};

export const getPropValueErrors = ({
  type,
  value,
}: {
  type: Prop["type"];
  value?: unknown;
}) => {
  if (type !== "expression") {
    return listPropExpressions({ type, value }).flatMap(
      ({ expression, allowAssignment, variables }) =>
        getExpressionErrorMessages({
          expression,
          allowAssignment,
          availableVariables: new Set(variables),
        })
    );
  }
  return getExpressionErrors(String(value));
};

export const isPrimitiveValue = (value: unknown) => {
  if (value === null || value === undefined) {
    return true;
  }
  const type = typeof value;
  return type === "string" || type === "number" || type === "boolean";
};

export const validatePrimitiveValue = (value: unknown, label: string) => {
  if (isPrimitiveValue(value) === false) {
    return `${label} expects a primitive value (string, number, boolean, null, or undefined), not an object, array, or function`;
  }
};

const addExpressionIssues = (
  context: z.RefinementCtx,
  errors: readonly string[],
  path: (string | number)[] = []
) => {
  for (const message of errors) {
    addZodValidationIssue(context, {
      code: "invalid_expression",
      path: path.map(String),
      message: "Invalid Webstudio expression",
      constraint: "valid_webstudio_expression",
      example: "item.title",
      detail: message,
    });
  }
};

const propValueBaseInput = {
  propId: runtimeGeneratedIdInput,
  instanceId: z.string().describe("Instance id that owns the prop."),
  name: z.string().describe("Prop or HTML attribute name."),
  required: z.boolean().optional(),
};

const propValueInputVariants = [
  z.object({
    ...propValueBaseInput,
    type: z.literal("number"),
    value: z.number(),
  }),
  z.object({
    ...propValueBaseInput,
    type: z.literal("string"),
    value: z.string(),
  }),
  z.object({
    ...propValueBaseInput,
    type: z.literal("boolean"),
    value: z.boolean(),
  }),
  z.object({
    ...propValueBaseInput,
    type: z.literal("json"),
    value: z.unknown(),
  }),
  z.object({
    ...propValueBaseInput,
    type: z.literal("asset"),
    value: z.string().describe("Asset id."),
  }),
  z.object({
    ...propValueBaseInput,
    type: z.literal("page"),
    value: z.union([
      z.string().describe("Page id."),
      z.object({
        pageId: z.string(),
        instanceId: z.string(),
      }),
    ]),
  }),
  z.object({
    ...propValueBaseInput,
    type: z.literal("string[]"),
    value: z.array(z.string()),
  }),
  z.object({
    ...propValueBaseInput,
    type: z.literal("parameter"),
    value: z.string().describe("Data source id."),
  }),
  z.object({
    ...propValueBaseInput,
    type: z.literal("resource"),
    value: z.string().describe("Resource id."),
  }),
  z.object({
    ...propValueBaseInput,
    type: z.literal("expression"),
    value: z
      .string()
      .describe(
        "One Webstudio JavaScript expression, not a statement or function. Read webstudio://project/expressions for syntax and scope rules."
      ),
  }),
  z.object({
    ...propValueBaseInput,
    type: z.literal("action"),
    value: z.array(
      z.object({
        type: z.literal("execute"),
        args: z.array(z.string()),
        code: z.string(),
      })
    ),
  }),
  z.object({
    ...propValueBaseInput,
    type: z.literal("animationAction"),
    value: z
      .unknown()
      .describe("Animation action payload. Prefer existing animation tools."),
  }),
] as const;

export const propValueInput = z
  .discriminatedUnion("type", propValueInputVariants)
  .describe(
    'Direct prop value update. Match value to type: use type "string" for fixed text attributes such as placeholder, aria-label, alt, id, class, href, and title; use bind-props for dynamic expressions/resources/actions.'
  )
  .superRefine((value, context) => {
    addExpressionIssues(context, getPropValueErrors(value), ["value"]);
  });

export const dataPropBindingInput = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("expression"),
    value: z
      .string()
      .describe(
        "One Webstudio JavaScript expression. Read webstudio://project/expressions before using unfamiliar scope or syntax."
      ),
  }),
  z.object({ type: z.literal("parameter"), value: z.string() }),
  z.object({ type: z.literal("resource"), value: z.string() }),
]);

const actionPropBindingInput = z.object({
  type: z.literal("action"),
  value: z.array(
    z.object({
      type: z.literal("execute"),
      args: z.array(z.string()),
      code: z.string(),
    })
  ),
});

export const propBindingInput = z
  .object({
    propId: runtimeGeneratedIdInput,
    instanceId: z.string(),
    name: z.string(),
    binding: z.discriminatedUnion("type", [
      ...dataPropBindingInput.options,
      actionPropBindingInput,
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
  updates: z
    .array(propValueInput)
    .min(1)
    .describe(
      'Atomic batch of direct prop updates. Every item must be valid or the batch is rejected; split unrelated updates into smaller batches if you want easier recovery. For textarea placeholder use { "name": "placeholder", "type": "string", "value": "..." }.'
    ),
});

export const replacePropTextInput = z.object({
  find: z.string().min(1).describe("Fixed prop text to find."),
  replace: z.string().describe("Replacement fixed prop text."),
  match: z
    .enum(["exact", "substring"])
    .default("exact")
    .describe(
      'Use "exact" to replace complete prop values, or "substring" to replace every literal occurrence in matching prop values.'
    ),
  instanceIds: z
    .array(z.string())
    .min(1)
    .optional()
    .describe("Optional instance ids to limit the replacement scope."),
  names: z
    .array(z.string())
    .min(1)
    .optional()
    .describe(
      "Optional prop names to limit the replacement scope, such as href or code."
    ),
  limit: z
    .number()
    .int()
    .min(1)
    .max(200)
    .default(50)
    .describe("Maximum number of prop values to change."),
});

export type PropValueInput = z.infer<typeof propValueInput>;
export type PropValueUpdate =
  | Pick<Extract<Prop, { type: "number" }>, "type" | "value">
  | Pick<Extract<Prop, { type: "string" }>, "type" | "value">
  | Pick<Extract<Prop, { type: "boolean" }>, "type" | "value">
  | Pick<Extract<Prop, { type: "json" }>, "type" | "value">
  | Pick<Extract<Prop, { type: "string[]" }>, "type" | "value">
  | Pick<Extract<Prop, { type: "expression" }>, "type" | "value">
  | Pick<Extract<Prop, { type: "asset" }>, "type" | "value">
  | Pick<Extract<Prop, { type: "page" }>, "type" | "value">
  | Pick<Extract<Prop, { type: "action" }>, "type" | "value">
  | Pick<Extract<Prop, { type: "animationAction" }>, "type" | "value">;

export const createStartingPropValueFromMeta = (
  meta: PropMeta,
  defaultBooleanValue: boolean
): PropValueUpdate | undefined => {
  if (meta.type === "string" && meta.control !== "file") {
    return {
      type: "string",
      value: meta.defaultValue ?? "",
    };
  }

  if (meta.type === "number") {
    return {
      type: "number",
      value: meta.defaultValue ?? 0,
    };
  }

  if (meta.type === "boolean") {
    return {
      type: "boolean",
      value: meta.defaultValue ?? defaultBooleanValue,
    };
  }

  if (meta.type === "string[]") {
    return {
      type: "string[]",
      value: meta.defaultValue ?? [],
    };
  }

  if (meta.type === "action") {
    return {
      type: "action",
      value: [],
    };
  }
};

export const getDefaultPropMetaForType = (type: Prop["type"]): PropMeta => {
  switch (type) {
    case "action":
      return { type: "action", control: "action", required: false };
    case "string":
      return { type: "string", control: "text", required: false };
    case "number":
      return { type: "number", control: "number", required: false };
    case "boolean":
      return { type: "boolean", control: "boolean", required: false };
    case "asset":
      return { type: "string", control: "file", required: false };
    case "page":
      return { type: "string", control: "url", required: false };
    case "animationAction":
      return {
        type: "animationAction",
        control: "animationAction",
        required: false,
      };
    case "string[]":
    case "json":
    case "expression":
    case "parameter":
    case "resource":
      throw new Error(
        `A prop with type ${type} must have a meta, we can't provide a default one because we need a list of options`
      );
    default:
      const unsupportedType: never = type;
      throw new Error(`Unsupported prop type: ${unsupportedType}`);
  }
};

export const createPropValueInputFromProp = (prop: Prop): PropValueInput => {
  const base = {
    instanceId: prop.instanceId,
    name: prop.name,
    required: prop.required,
  };
  switch (prop.type) {
    case "number":
      return { ...base, type: prop.type, value: prop.value };
    case "string":
      return { ...base, type: prop.type, value: prop.value };
    case "boolean":
      return { ...base, type: prop.type, value: prop.value };
    case "json":
      return { ...base, type: prop.type, value: prop.value };
    case "asset":
      return { ...base, type: prop.type, value: prop.value };
    case "page":
      return { ...base, type: prop.type, value: prop.value };
    case "string[]":
      return { ...base, type: prop.type, value: prop.value };
    case "parameter":
      return { ...base, type: prop.type, value: prop.value };
    case "resource":
      return { ...base, type: prop.type, value: prop.value };
    case "expression":
      return { ...base, type: prop.type, value: prop.value };
    case "action":
      return { ...base, type: prop.type, value: prop.value };
    case "animationAction":
      return { ...base, type: prop.type, value: prop.value };
    default:
      prop satisfies never;
      throw new Error("Unsupported prop type");
  }
};

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

type PropValueInputWithId = Omit<z.infer<typeof propValueInput>, "propId"> & {
  propId?: Prop["id"];
};

type PropBindingInputWithId = Omit<
  z.infer<typeof propBindingInput>,
  "propId"
> & {
  propId?: Prop["id"];
};

const createMissingId = (): Prop["id"] => {
  throw new Error("createId is required when propId is not provided.");
};

export const createValidatedPropValueFromInput = (
  value: PropValueInputWithId,
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
  binding: PropBindingInputWithId,
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
  const propList = Array.from(props);
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
      props: propList,
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

const getHtmlEmbedCodeErrors = (instance: Instance, update: PropValueInput) => {
  if (
    instance.component !== "HtmlEmbed" ||
    update.name !== "code" ||
    update.type !== "string"
  ) {
    return [];
  }
  const error = validateHtmlEmbedCode(update.value);
  return error === undefined ? [] : [error.message];
};

const getJsonLdCodeErrors = (instance: Instance, update: PropValueInput) => {
  if (instance.component !== "JsonLd" || update.name !== "code") {
    return [];
  }
  if (isDynamicPropType(update.type)) {
    return [];
  }
  if (update.type !== "string") {
    return ['JSON-LD code must use prop type "string".'];
  }
  const result = validateJsonLd(update.value);
  return result.diagnostics
    .filter(({ severity }) => severity === "error")
    .map(({ path, message }) => `JSON-LD ${path}: ${message}`);
};

export const updateProps = (
  state: Pick<BuilderState, "instances" | "props">,
  input: z.infer<typeof propUpdatesInput>,
  context: { createId: () => string }
) => {
  const { instances, props } = getRequiredPropState(state);
  const nextProps = input.updates.map((update) => {
    assertRuntimeInstance(instances, update.instanceId);
    const instance = instances.get(update.instanceId)!;
    const htmlEmbedCodeErrors = getHtmlEmbedCodeErrors(instance, update);
    const codeErrors = [
      ...htmlEmbedCodeErrors,
      ...getJsonLdCodeErrors(instance, update),
    ];
    if (codeErrors.length > 0) {
      return throwPropErrors(codeErrors);
    }
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

export const replacePropText = (
  state: Pick<BuilderState, "instances" | "props">,
  input: z.infer<typeof replacePropTextInput>
) => {
  const { instances, props } = getRequiredPropState(state);
  const instanceIds =
    input.instanceIds === undefined ? undefined : new Set(input.instanceIds);
  const names = input.names === undefined ? undefined : new Set(input.names);
  const matches: Array<{
    propId: string;
    instanceId: string;
    name: string;
    before: string;
    after: string;
  }> = [];
  let matchingPropCount = 0;
  for (const prop of props.values()) {
    if (
      prop.type !== "string" ||
      (instanceIds !== undefined &&
        instanceIds.has(prop.instanceId) === false) ||
      (names !== undefined && names.has(prop.name) === false)
    ) {
      continue;
    }
    const after = replaceTextValue(prop.value, input);
    if (after === prop.value) {
      continue;
    }
    matchingPropCount += 1;
    if (matches.length >= input.limit) {
      continue;
    }
    const instance = instances.get(prop.instanceId);
    if (instance?.component === "HtmlEmbed" && prop.name === "code") {
      const error = validateHtmlEmbedCode(after);
      if (error !== undefined) {
        return throwPropErrors([error.message]);
      }
    }
    if (instance?.component === "JsonLd" && prop.name === "code") {
      const result = validateJsonLd(after);
      if (result.success === false) {
        return throwPropErrors(
          result.diagnostics
            .filter(({ severity }) => severity === "error")
            .map(({ path, message }) => `JSON-LD ${path}: ${message}`)
        );
      }
    }
    matches.push({
      propId: prop.id,
      instanceId: prop.instanceId,
      name: prop.name,
      before: prop.value,
      after,
    });
  }
  const result = {
    changedCount: matches.length,
    matchingPropCount,
    truncated: matchingPropCount > matches.length,
    matches,
  };
  if (matches.length === 0) {
    return createRuntimeMutation({
      payload: [],
      result,
      invalidatesNamespaces: [],
    });
  }
  return createRuntimeMutation({
    payload: [
      {
        namespace: "props",
        patches: matches.map(({ propId, after }) => ({
          op: "replace" as const,
          path: [propId, "value"],
          value: after,
        })),
      },
    ],
    result,
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
