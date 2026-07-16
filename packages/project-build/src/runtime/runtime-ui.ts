import { collectionComponent } from "@webstudio-is/sdk";
import { z } from "zod";
import type { BuilderState } from "../state/builder-state";
import * as collection from "./collection";
import * as components from "./components";
import type { BuilderRuntimeContext } from "./context";
import * as data from "./data";
import { throwBuilderRuntimeError } from "./errors";
import {
  bindExpressionInput,
  getScopedExpressionWarnings,
} from "./expression-scope";
import { listFragmentExpressions } from "./fragment";
import { createRuntimeMutationAccumulator } from "./mutation";
import * as props from "./props";
import type { ExpressionWarning } from "./expression-validation";

const retainedBehaviorInput = z.object({
  instanceId: z
    .string()
    .describe("Existing script-owning instance that remains unchanged."),
  responsibility: z
    .string()
    .min(1)
    .describe("Runtime behavior retained by the existing instance."),
});

const unsupportedConversionInput = z.object({
  behavior: z.string().min(1),
  reason: z
    .string()
    .min(1)
    .describe("Why this behavior cannot be represented safely in editable UI."),
});

const variableInput = z.object({
  name: data.dataVariableCreateInput.shape.name,
  value: data.dataVariableCreateInput.shape.value,
});

const resourceInput = z.object({
  resource: data.resourceCreateInput.shape.resource,
  dataSourceName: data.resourceCreateInput.shape.dataSourceName,
  exposeAsDataSource: data.resourceCreateInput.shape.exposeAsDataSource,
});

const fragmentStructureInput = z.object({
  type: z.literal("fragment"),
  fragment: components.insertFragmentInput.shape.fragment,
  conflictResolution: components.insertFragmentInput.shape.conflictResolution,
  contentMode: components.insertFragmentInput.shape.contentMode,
  mode: components.insertFragmentInput.shape.mode,
  insertIndex: components.insertFragmentInput.shape.insertIndex,
});

const collectionStructureInput = z.object({
  type: z.literal("collection"),
  data: collection.insertCollectionInput.shape.data,
  itemFragment: collection.insertCollectionInput.shape.itemFragment,
  mode: collection.insertCollectionInput.shape.mode,
  insertIndex: collection.insertCollectionInput.shape.insertIndex,
});

const bindingTargetInput = z.discriminatedUnion("type", [
  z.object({ type: z.literal("existing"), instanceId: z.string() }),
  z.object({
    type: z.literal("insertedRoot"),
    index: z.number().int().nonnegative().default(0),
  }),
]);

const bindingInput = z.object({
  target: bindingTargetInput,
  name: z.string(),
  binding: props.dataPropBindingInput.describe(
    "Data binding only. Script actions are intentionally unsupported by runtime-ui integration."
  ),
});

export const integrateRuntimeUiInput = z
  .object({
    parentInstanceId: z.string(),
    variables: z.array(variableInput).default([]),
    resources: z.array(resourceInput).default([]),
    structure: z.discriminatedUnion("type", [
      fragmentStructureInput,
      collectionStructureInput,
    ]),
    bindings: z.array(bindingInput).default([]),
    retainedBehavior: z.array(retainedBehaviorInput).default([]),
    unsupportedConversions: z.array(unsupportedConversionInput).default([]),
  })
  .describe(
    "Atomically integrate data-backed editable UI while retaining existing script-owned behavior. This operation stores declarative Webstudio data and never evaluates scripts."
  );

type IntegrationInput = z.infer<typeof integrateRuntimeUiInput>;

const getRequiredInstances = (state: BuilderState) => {
  if (state.instances === undefined) {
    return throwBuilderRuntimeError("BAD_REQUEST", "Instances are missing");
  }
  return state.instances;
};

const assertIntegrationTargets = (
  state: BuilderState,
  input: IntegrationInput
) => {
  const instances = getRequiredInstances(state);
  if (instances.has(input.parentInstanceId) === false) {
    return throwBuilderRuntimeError("NOT_FOUND", "Parent instance not found");
  }
  for (const behavior of input.retainedBehavior) {
    if (instances.has(behavior.instanceId) === false) {
      return throwBuilderRuntimeError(
        "NOT_FOUND",
        `Retained behavior instance "${behavior.instanceId}" not found`
      );
    }
  }
  for (const binding of input.bindings) {
    if (
      binding.target.type === "existing" &&
      instances.has(binding.target.instanceId) === false
    ) {
      return throwBuilderRuntimeError(
        "NOT_FOUND",
        `Binding target instance "${binding.target.instanceId}" not found`
      );
    }
  }
  const fragment =
    input.structure.type === "fragment"
      ? input.structure.fragment
      : input.structure.itemFragment;
  if (
    input.structure.type === "fragment" &&
    fragment.instances.some(
      (instance) =>
        instance.component === collectionComponent ||
        instance.component.endsWith(":Collection")
    )
  ) {
    return throwBuilderRuntimeError(
      "BAD_REQUEST",
      'Do not place a Collection component inside a generic fragment. Use structure.type "collection" with data and itemFragment so Webstudio creates the Collection parameters and bindings.'
    );
  }
  if (
    fragment.instances.some((instance) => instance.component === "HtmlEmbed")
  ) {
    return throwBuilderRuntimeError(
      "BAD_REQUEST",
      "Editable runtime UI cannot create HtmlEmbed scripts. Keep existing script behavior in retainedBehavior and insert only editable presentational components."
    );
  }
};

const getBindingInstanceId = ({
  target,
  rootInstanceIds,
}: {
  target: z.infer<typeof bindingTargetInput>;
  rootInstanceIds: readonly string[];
}) => {
  if (target.type === "existing") {
    return target.instanceId;
  }
  const instanceId = rootInstanceIds[target.index];
  if (instanceId === undefined) {
    return throwBuilderRuntimeError(
      "BAD_REQUEST",
      `Inserted root index ${target.index} does not exist`
    );
  }
  return instanceId;
};

export const integrateRuntimeUi = (
  state: BuilderState,
  input: IntegrationInput,
  context: BuilderRuntimeContext
) => {
  assertIntegrationTargets(state, input);
  const accumulator = createRuntimeMutationAccumulator(state);

  const variableIds = input.variables.map((variable) =>
    String(
      accumulator.stage(
        data.createDataVariable(
          accumulator.state,
          {
            ...variable,
            scopeInstanceId: input.parentInstanceId,
          },
          context
        )
      ).dataSourceId
    )
  );

  const warnings: ExpressionWarning[] = [];
  const resources = input.resources.map((resource) => {
    const result = accumulator.stage(
      data.createResource(
        accumulator.state,
        {
          ...resource,
          scopeInstanceId: input.parentInstanceId,
        },
        context
      )
    );
    warnings.push(...result.warnings);
    return {
      resourceId: result.resourceId,
      ...(result.dataSourceId === undefined
        ? {}
        : { dataSourceId: result.dataSourceId }),
    };
  });

  if (input.structure.type === "collection") {
    for (const entry of listFragmentExpressions(input.structure.itemFragment)) {
      warnings.push(
        ...getScopedExpressionWarnings(
          accumulator.state,
          input.parentInstanceId,
          ["structure", "itemFragment", ...entry.path],
          entry.expression,
          entry.allowAssignment,
          ["collectionItem", "collectionItemKey", ...entry.variables]
        )
      );
    }
  }

  let structureResult: {
    instanceIds: string[];
    rootInstanceIds: string[];
  };
  if (input.structure.type === "collection") {
    structureResult = accumulator.stage(
      components.insertCollection(
        accumulator.state,
        {
          parentInstanceId: input.parentInstanceId,
          data: input.structure.data,
          itemFragment: input.structure.itemFragment,
          mode: input.structure.mode,
          insertIndex: input.structure.insertIndex,
        },
        context
      )
    );
  } else {
    structureResult = accumulator.stage(
      components.insertFragment(
        accumulator.state,
        {
          parentInstanceId: input.parentInstanceId,
          fragment: input.structure.fragment,
          conflictResolution: input.structure.conflictResolution,
          contentMode: input.structure.contentMode,
          mode: input.structure.mode,
          insertIndex: input.structure.insertIndex,
        },
        context
      )
    );
  }

  const resolvedBindings = input.bindings.map((binding, index) => {
    const instanceId = getBindingInstanceId({
      target: binding.target,
      rootInstanceIds: structureResult.rootInstanceIds,
    });
    if (binding.binding.type === "expression") {
      warnings.push(
        ...getScopedExpressionWarnings(
          accumulator.state,
          instanceId,
          ["bindings", String(index), "binding", "value"],
          binding.binding.value
        )
      );
    }
    return {
      instanceId,
      name: binding.name,
      binding:
        binding.binding.type === "expression"
          ? {
              ...binding.binding,
              value: bindExpressionInput(
                accumulator.state,
                instanceId,
                binding.binding.value
              ),
            }
          : binding.binding,
    };
  });
  const propIds =
    resolvedBindings.length === 0
      ? []
      : accumulator.stage(
          props.bindProps(
            accumulator.state,
            { bindings: resolvedBindings },
            context
          )
        ).propIds;

  return accumulator.complete({
    created: {
      variableIds,
      resources,
      instanceIds: structureResult.instanceIds,
      rootInstanceIds: structureResult.rootInstanceIds,
      propIds,
    },
    editableStructure: {
      type: input.structure.type,
      usesCollection: input.structure.type === "collection",
    },
    retainedBehavior: input.retainedBehavior,
    unsupportedConversions: input.unsupportedConversions,
    warnings,
  });
};
