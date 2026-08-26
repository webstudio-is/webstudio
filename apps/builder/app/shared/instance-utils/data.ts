// Data utilities own access to Webstudio's instance-related stores and
// transaction boundaries. Put generic store reads/writes and content-mode data
// guards here, not tree-shape mutations.
import { toast } from "@webstudio-is/design-system";
import { type WebstudioData, isPageTemplate } from "@webstudio-is/sdk";
import {
  BuilderRuntimeError,
  blockTemplateNameConfirmationInput,
  builderRuntimeContext,
  executeBuilderRuntimeOperation,
  createRuntimeMutationAccumulator,
  type BuilderRuntimeContext,
  type BuilderRuntimeMutation,
  type BuilderRuntimeOperationInput,
  type BuilderRuntimeMutationOperationId,
  type BuilderRuntimeOperationResult,
} from "@webstudio-is/project-build/runtime";
import { applyBuilderPatchTransactions } from "@webstudio-is/project-build/state";
import { atom } from "nanostores";
import { $canOpenPageTemplates, $selectedPage } from "../nano-states";
import {
  createSyncChangesFromBuilderPatchPayload,
  createTransactionFromBuilderPatchPayload,
} from "../sync/builder-patch";
import { $project, readBuilderStateStores } from "../sync/data-stores";
import { externalContentSyncStore } from "../sync/sync-stores";
import {
  getAffectedExternalContentRootKeys,
  getExternalContentRoots,
  publishExternalContentMutation,
} from "../external-content-mutations";
import {
  createExternalContentPersistencePlan,
  getExternalContentOwnership,
  getExternalContentOwnershipFromState,
} from "../external-content-persistence";

type RuntimeMutationResult<Id extends BuilderRuntimeMutationOperationId> =
  Extract<BuilderRuntimeOperationResult<Id>, BuilderRuntimeMutation>;

export type RuntimeMutationOperation = {
  [Id in BuilderRuntimeMutationOperationId]: {
    id: Id;
    input: BuilderRuntimeOperationInput<Id>;
  };
}[BuilderRuntimeMutationOperationId];

type TemplateNameConfirmation = ReturnType<
  typeof blockTemplateNameConfirmationInput.parse
>;
type PendingTemplateNameConfirmation =
  | {
      operation: RuntimeMutationOperation;
      confirmation: TemplateNameConfirmation;
      asynchronous?: boolean;
    }
  | {
      operations: readonly RuntimeMutationOperation[];
      operationIndex: number;
      confirmation: TemplateNameConfirmation;
    };

export const $pendingTemplateNameConfirmation = atom<
  PendingTemplateNameConfirmation | undefined
>(undefined);

const getTemplateNameConfirmation = (error: unknown) => {
  if (error instanceof BuilderRuntimeError === false) {
    return;
  }
  const issue = error.issues?.find(
    ({ code }) => code === "template_name_change_requires_confirmation"
  );
  const parsed = blockTemplateNameConfirmationInput.safeParse(issue?.example);
  return parsed.success ? parsed.data : undefined;
};

const addTemplateNameConfirmation = (
  operation: RuntimeMutationOperation,
  confirmation: TemplateNameConfirmation
) =>
  ({
    ...operation,
    input: { ...operation.input, templateNameConfirmation: confirmation },
  }) as RuntimeMutationOperation;

export const getDuplicateTemplateNameMessage = (error: unknown) => {
  if (error instanceof BuilderRuntimeError === false) {
    return;
  }
  return error.issues?.find(({ code }) => code === "duplicate_template_name")
    ?.message;
};

export type WebstudioInstanceData = Pick<
  WebstudioData,
  | "instances"
  | "props"
  | "styleSourceSelections"
  | "styleSources"
  | "styles"
  | "dataSources"
  | "resources"
>;

const canCommitWebstudioData = () => {
  const selectedPage = $selectedPage.get();
  return (
    isPageTemplate(selectedPage) === false ||
    $canOpenPageTemplates.get() === true
  );
};

export const migrateLoadedWebstudioData = () => {
  const result = executeRuntimeMutation({
    id: "system.migrateLoadedData",
    input: {},
  });
  if (result?.result.didBreakCycles === true) {
    toast.info("Detected and fixed cycles in the instance tree.");
  }
};

const getRuntimeMutationContext = () => ({
  createId: builderRuntimeContext.createId,
  projectId: $project.get()?.id,
});

type RuntimeMutationContext = Pick<
  BuilderRuntimeContext,
  "allowLegacyContentModelWarnings"
>;

const requireSynchronousResult = <Result>(
  id: BuilderRuntimeMutationOperationId,
  result: Result | Promise<Result>
): Result => {
  if (result instanceof Promise) {
    throw Error(`Builder runtime operation "${id}" must be synchronous.`);
  }
  return result;
};

const createRuntimeMutationArgs = <
  Id extends BuilderRuntimeMutationOperationId,
>({
  id,
  input,
  context,
}: {
  id: Id;
  input: BuilderRuntimeOperationInput<Id>;
  context?: RuntimeMutationContext;
}) => ({
  id,
  state: getWebstudioData(),
  input,
  context: { ...getRuntimeMutationContext(), ...context },
});

const commitRuntimeMutation = <Mutation extends BuilderRuntimeMutation>(
  result: Mutation
): Mutation => {
  const data = getWebstudioData();
  const roots = getExternalContentRoots();
  const payload = result.payload;
  const affectedRootKeys = new Set(
    getAffectedExternalContentRootKeys({ state: data, roots, payload })
  );
  if (affectedRootKeys.size === 0) {
    createTransactionFromBuilderPatchPayload({ data, payload });
    return result;
  }
  const beforeOwnership = getExternalContentOwnership(roots);
  const afterData = applyBuilderPatchTransactions(data, [
    { id: "external-content-persistence-plan", payload },
  ]).state as ReturnType<typeof getWebstudioData>;
  const afterOwnership = getExternalContentOwnershipFromState({
    state: afterData,
    roots,
    rootKeys: affectedRootKeys,
  });
  const plan = createExternalContentPersistencePlan({
    beforeData: data,
    afterData,
    beforeOwnership,
    afterOwnership,
    externalBlockInstanceIds: new Set(
      Array.from(roots.values(), ({ blockInstanceId }) => blockInstanceId)
    ),
    payload,
  });
  if (plan.preliminaryExternalPayload.length > 0) {
    externalContentSyncStore.createTransactionFromChanges(
      createSyncChangesFromBuilderPatchPayload({
        data,
        payload: plan.preliminaryExternalPayload,
      })
    );
  }
  if (plan.projectPayload.length > 0) {
    createTransactionFromBuilderPatchPayload({
      data: getWebstudioData(),
      payload: plan.projectPayload,
    });
  }
  if (plan.externalPayload.length > 0) {
    externalContentSyncStore.createTransactionFromChanges(
      createSyncChangesFromBuilderPatchPayload({
        data: getWebstudioData(),
        payload: plan.externalPayload,
      })
    );
  }
  publishExternalContentMutation(Array.from(affectedRootKeys));
  return result;
};

export const executeRuntimeMutation = <
  Id extends BuilderRuntimeMutationOperationId,
>({
  id,
  input,
  context,
}: {
  id: Id;
  input: BuilderRuntimeOperationInput<Id>;
  context?: RuntimeMutationContext;
}): RuntimeMutationResult<Id> | undefined => {
  if (canCommitWebstudioData() === false) {
    return;
  }
  try {
    return commitRuntimeMutation(
      requireSynchronousResult(
        id,
        executeBuilderRuntimeOperation<RuntimeMutationResult<Id>>(
          createRuntimeMutationArgs({ id, input, context })
        )
      )
    );
  } catch (error) {
    const confirmation = getTemplateNameConfirmation(error);
    if (confirmation === undefined) {
      throw error;
    }
    $pendingTemplateNameConfirmation.set({
      operation: { id, input } as RuntimeMutationOperation,
      confirmation,
    });
    return;
  }
};

export const abortPendingTemplateNameConfirmation = () => {
  $pendingTemplateNameConfirmation.set(undefined);
};

export const confirmPendingTemplateNameChange = () => {
  const pending = $pendingTemplateNameConfirmation.get();
  if (pending === undefined) {
    return;
  }
  $pendingTemplateNameConfirmation.set(undefined);
  try {
    if ("operations" in pending) {
      executeRuntimeMutationSequence(
        pending.operations.map((operation, index) =>
          index === pending.operationIndex
            ? addTemplateNameConfirmation(operation, pending.confirmation)
            : operation
        )
      );
      return;
    }
    const operation = addTemplateNameConfirmation(
      pending.operation,
      pending.confirmation
    );
    if (pending.asynchronous) {
      void executeRuntimeMutationAsync(operation).catch((error) => {
        toast.error(
          error instanceof Error
            ? error.message
            : "The template change could not be applied."
        );
      });
    } else {
      executeRuntimeMutation(operation);
    }
  } catch (error) {
    toast.error(
      error instanceof Error
        ? error.message
        : "The template change could not be applied."
    );
  }
};

export const executeRuntimeMutationSequence = (
  operations: readonly RuntimeMutationOperation[]
): void => {
  if (canCommitWebstudioData() === false) {
    return;
  }
  const accumulator = createRuntimeMutationAccumulator(getWebstudioData());
  const results: Record<string, unknown>[] = [];
  for (const [operationIndex, { id, input }] of operations.entries()) {
    try {
      results.push(
        accumulator.stage(
          requireSynchronousResult(
            id,
            executeBuilderRuntimeOperation<BuilderRuntimeMutation>({
              id,
              state: accumulator.state,
              input,
              context: getRuntimeMutationContext(),
            })
          )
        )
      );
    } catch (error) {
      const confirmation = getTemplateNameConfirmation(error);
      if (confirmation === undefined) {
        throw error;
      }
      $pendingTemplateNameConfirmation.set({
        operations,
        operationIndex,
        confirmation,
      });
      return;
    }
  }
  commitRuntimeMutation(accumulator.complete({ results }));
};

export const executeRuntimeMutationAsync = async <
  Id extends BuilderRuntimeMutationOperationId,
>({
  id,
  input,
  context,
}: {
  id: Id;
  input: BuilderRuntimeOperationInput<Id>;
  context?: RuntimeMutationContext;
}): Promise<RuntimeMutationResult<Id> | undefined> => {
  if (canCommitWebstudioData() === false) {
    return;
  }
  try {
    const result = await executeBuilderRuntimeOperation<
      RuntimeMutationResult<Id>
    >(createRuntimeMutationArgs({ id, input, context }));
    return commitRuntimeMutation(result);
  } catch (error) {
    const confirmation = getTemplateNameConfirmation(error);
    if (confirmation === undefined) {
      throw error;
    }
    $pendingTemplateNameConfirmation.set({
      operation: { id, input } as RuntimeMutationOperation,
      confirmation,
      asynchronous: true,
    });
    return;
  }
};

export const getWebstudioData = () => {
  const data = readBuilderStateStores();
  const { pages } = data;
  if (pages === undefined) {
    throw Error(`Cannot get webstudio data with empty pages`);
  }
  const projectSettings = data.projectSettings ?? { meta: {}, compiler: {} };
  return {
    ...data,
    pages,
    projectSettings,
  };
};
