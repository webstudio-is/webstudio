// Data utilities own access to Webstudio's instance-related stores and
// transaction boundaries. Put generic store reads/writes and content-mode data
// guards here, not tree-shape mutations.
import { toast } from "@webstudio-is/design-system";
import { type WebstudioData, isPageTemplate } from "@webstudio-is/sdk";
import {
  executeBuilderRuntimeOperation,
  createRuntimeMutationAccumulator,
  type BuilderRuntimeOperationInput,
  type BuilderRuntimeMutationOperationId,
  type BuilderRuntimeOperationResult,
} from "@webstudio-is/project-build/runtime";
import { builderRuntimeContext } from "@webstudio-is/project-build/runtime";
import { type BuilderRuntimeMutation } from "@webstudio-is/project-build/runtime";
import { $canOpenPageTemplates, $selectedPage } from "../nano-states";
import { createTransactionFromBuilderPatchPayload } from "../sync/builder-patch";
import { $project, readBuilderStateStores } from "../sync/data-stores";

type RuntimeMutationResult<Id extends BuilderRuntimeMutationOperationId> =
  Extract<BuilderRuntimeOperationResult<Id>, BuilderRuntimeMutation>;

export type RuntimeMutationOperation = {
  [Id in BuilderRuntimeMutationOperationId]: {
    id: Id;
    input: BuilderRuntimeOperationInput<Id>;
  };
}[BuilderRuntimeMutationOperationId];

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
}: {
  id: Id;
  input: BuilderRuntimeOperationInput<Id>;
}) => ({
  id,
  state: getWebstudioData(),
  input,
  context: getRuntimeMutationContext(),
});

const commitRuntimeMutation = <Mutation extends BuilderRuntimeMutation>(
  result: Mutation
): Mutation => {
  createTransactionFromBuilderPatchPayload({
    data: getWebstudioData(),
    payload: result.payload,
  });
  return result;
};

export const executeRuntimeMutation = <
  Id extends BuilderRuntimeMutationOperationId,
>({
  id,
  input,
}: {
  id: Id;
  input: BuilderRuntimeOperationInput<Id>;
}): RuntimeMutationResult<Id> | undefined => {
  if (canCommitWebstudioData() === false) {
    return;
  }
  return commitRuntimeMutation(
    requireSynchronousResult(
      id,
      executeBuilderRuntimeOperation<RuntimeMutationResult<Id>>(
        createRuntimeMutationArgs({ id, input })
      )
    )
  );
};

export const executeRuntimeMutationSequence = (
  operations: readonly RuntimeMutationOperation[]
): void => {
  if (canCommitWebstudioData() === false) {
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
}: {
  id: Id;
  input: BuilderRuntimeOperationInput<Id>;
}): Promise<RuntimeMutationResult<Id> | undefined> => {
  if (canCommitWebstudioData() === false) {
    return;
  }
  const result = await executeBuilderRuntimeOperation<
    RuntimeMutationResult<Id>
  >(createRuntimeMutationArgs({ id, input }));
  return commitRuntimeMutation(result);
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
