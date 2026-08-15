// Data utilities own access to Webstudio's instance-related stores and
// transaction boundaries. Put generic store reads/writes and content-mode data
// guards here, not tree-shape mutations.
import { toast } from "@webstudio-is/design-system";
import { type WebstudioData, isPageTemplate } from "@webstudio-is/sdk";
import {
  BuilderRuntimeError,
  blockTemplateNameConfirmationInput,
  executeBuilderRuntimeOperation,
  createRuntimeMutationAccumulator,
  type BuilderRuntimeOperationInput,
  type BuilderRuntimeMutationOperationId,
  type BuilderRuntimeOperationResult,
} from "@webstudio-is/project-build/runtime";
import { atom } from "nanostores";
import {
  builderRuntimeContext,
  type BuilderRuntimeContext,
} from "@webstudio-is/project-build/runtime";
import { type BuilderRuntimeMutation } from "@webstudio-is/project-build/runtime";
import { $canOpenPageTemplates, $selectedPage } from "../nano-states";
import { createTransactionFromBuilderPatchPayload } from "../sync/builder-patch";
import { $project, readBuilderStateStores } from "../sync/data-stores";
import {
  $allSelectedInstanceSelectors,
  clearInstanceSelection,
  selectInstance,
} from "../nano-states";
import {
  getMaterializedContentStatus,
  getMaterializedContentSaveBlocker,
  $activeMaterializedContentRoots,
  saveMaterializedContentChanges,
  $contentBlockPresentationItems,
  failPendingMaterializedContentChanges,
} from "../content-block-content";

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

type PendingTemplateNameConfirmation = {
  operation: RuntimeMutationOperation;
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
  const result = blockTemplateNameConfirmationInput.safeParse(issue?.example);
  return result.success ? result.data : undefined;
};

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

const isScopeSelected = (renderScope: string) => {
  const selectedSelectors = $allSelectedInstanceSelectors.get();
  if (selectedSelectors.length === 0) {
    return false;
  }
  let scope: unknown;
  try {
    scope = JSON.parse(renderScope);
  } catch {
    return false;
  }
  if (Array.isArray(scope) === false) {
    return false;
  }
  return selectedSelectors.some(
    (selected) =>
      scope.length <= selected.length &&
      scope.every(
        (instanceId, index) =>
          instanceId === selected[selected.length - scope.length + index]
      )
  );
};

const getSelectedMaterializedContent = () =>
  Array.from($activeMaterializedContentRoots.get().values()).filter(
    ({ identity }) => isScopeSelected(identity.renderScope)
  );

const getRuntimeMutationContext = () => ({
  createId: builderRuntimeContext.createId,
  projectId: $project.get()?.id,
  materializedContent: getSelectedMaterializedContent(),
  returnStorageChanges: true,
});

const canEditSelectedMaterializedContent = () => {
  if (
    $allSelectedInstanceSelectors
      .get()
      .some(([instanceId]) =>
        $contentBlockPresentationItems.get().has(instanceId)
      )
  ) {
    toast.error("MDX diagnostic notices cannot be edited.");
    return false;
  }
  const roots = getSelectedMaterializedContent();
  const blockIds = new Set<string>();
  for (const { identity } of roots) {
    if (blockIds.has(identity.blockInstanceId)) {
      toast.error(
        "Editing multiple repeated MDX scopes atomically is not available yet."
      );
      return false;
    }
    blockIds.add(identity.blockInstanceId);
  }
  for (const { identity } of roots) {
    const status = getMaterializedContentStatus({
      blockInstanceId: identity.blockInstanceId,
      renderScope: identity.renderScope,
    });
    if (status !== "ready" && status !== "empty" && status !== "pending") {
      toast.error("The MDX content source is not ready for editing.");
      return false;
    }
  }
  return true;
};

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
): Mutation | undefined => {
  if (result.storageChanges?.length) {
    const blocker =
      result.payload.length > 0
        ? {
            status: "blocked" as const,
            message:
              "This change requires atomic project and MDX file persistence, which is not available yet.",
          }
        : getMaterializedContentSaveBlocker(result.storageChanges);
    if (blocker !== undefined) {
      toast.error(blocker.message);
      return;
    }
    void saveMaterializedContentChanges(result.storageChanges).then(
      (saveResult) => {
        if (saveResult.status === "blocked") {
          failPendingMaterializedContentChanges(
            result.storageChanges ?? [],
            saveResult.message
          );
          toast.error(saveResult.message);
        }
      },
      () => {
        const message = "The MDX file could not be saved.";
        failPendingMaterializedContentChanges(
          result.storageChanges ?? [],
          message
        );
        toast.error(message);
      }
    );
    return result;
  }
  createTransactionFromBuilderPatchPayload({
    data: getWebstudioData(),
    payload: result.payload,
  });
  return result;
};

const commitRuntimeMutationAsync = async <
  Mutation extends BuilderRuntimeMutation,
>(
  result: Mutation
): Promise<Mutation | undefined> => {
  if (!result.storageChanges?.length) {
    return commitRuntimeMutation(result);
  }
  if (result.payload.length > 0) {
    toast.error(
      "This change requires atomic project and MDX file persistence, which is not available yet."
    );
    return;
  }
  try {
    const saveResult = await saveMaterializedContentChanges(
      result.storageChanges ?? []
    );
    if (saveResult.status === "blocked") {
      failPendingMaterializedContentChanges(
        result.storageChanges ?? [],
        saveResult.message
      );
      toast.error(saveResult.message);
      return;
    }
    return result;
  } catch (error) {
    const message = "The MDX file could not be saved.";
    failPendingMaterializedContentChanges(result.storageChanges ?? [], message);
    throw new Error(message, { cause: error });
  }
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
  if (canEditSelectedMaterializedContent() === false) {
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
  const operation = {
    ...pending.operation,
    input: {
      ...pending.operation.input,
      templateNameConfirmation: pending.confirmation,
    },
  } as RuntimeMutationOperation;
  let result: BuilderRuntimeMutation | undefined;
  try {
    result = executeRuntimeMutation(operation);
  } catch (error) {
    toast.error(
      error instanceof Error
        ? error.message
        : "The template change could not be applied."
    );
    return;
  }
  if (result === undefined) {
    return;
  }
  if (operation.id === "instances.delete") {
    clearInstanceSelection();
  }
  if (
    operation.id === "instances.deleteBySelector" &&
    "instanceSelector" in result.result &&
    Array.isArray(result.result.instanceSelector) &&
    result.result.instanceSelector.every(
      (instanceId) => typeof instanceId === "string"
    )
  ) {
    selectInstance(result.result.instanceSelector);
  }
};

export const executeRuntimeMutationSequence = (
  operations: readonly RuntimeMutationOperation[]
): void => {
  if (canCommitWebstudioData() === false) {
    return;
  }
  if (canEditSelectedMaterializedContent() === false) {
    return;
  }
  const accumulator = createRuntimeMutationAccumulator(getWebstudioData());
  const results = operations.map(({ id, input }) => {
    return accumulator.stage(
      requireSynchronousResult(
        id,
        executeBuilderRuntimeOperation<BuilderRuntimeMutation>({
          id,
          state: accumulator.state,
          input,
          context: getRuntimeMutationContext(),
        })
      )
    );
  });
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
  if (canEditSelectedMaterializedContent() === false) {
    return;
  }
  const result = await executeBuilderRuntimeOperation<
    RuntimeMutationResult<Id>
  >(createRuntimeMutationArgs({ id, input, context }));
  return commitRuntimeMutationAsync(result);
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
