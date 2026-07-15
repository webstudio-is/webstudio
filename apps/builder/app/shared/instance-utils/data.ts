// Data utilities own access to Webstudio's instance-related stores and
// transaction boundaries. Put generic store reads/writes and content-mode data
// guards here, not tree-shape mutations.
import { toast } from "@webstudio-is/design-system";
import { type WebstudioData, isPageTemplate } from "@webstudio-is/sdk";
import {
  executeBuilderRuntimeOperation,
  type BuilderRuntimeOperationInput,
  type BuilderRuntimeOperationId,
  type BuilderRuntimeOperationResult,
} from "@webstudio-is/project-build/runtime";
import { builderRuntimeContext } from "@webstudio-is/project-build/runtime";
import { type BuilderRuntimeMutation } from "@webstudio-is/project-build/runtime";
import { $canOpenPageTemplates, $selectedPage } from "../nano-states";
import { createTransactionFromBuilderPatchPayload } from "../sync/builder-patch";
import {
  $assets,
  $breakpoints,
  $dataSources,
  $instances,
  $marketplaceProduct,
  $pages,
  $projectSettings,
  $project,
  $props,
  $resources,
  $styles,
  $styleSourceSelections,
  $styleSources,
} from "../sync/data-stores";

type RuntimeMutationResult<Id extends BuilderRuntimeOperationId> = Extract<
  BuilderRuntimeOperationResult<Id>,
  BuilderRuntimeMutation
>;

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

const createRuntimeMutationArgs = <Id extends BuilderRuntimeOperationId>({
  id,
  input,
}: {
  id: Id;
  input: BuilderRuntimeOperationInput<Id>;
}) => ({
  id,
  state: getWebstudioData(),
  input,
  context: {
    createId: builderRuntimeContext.createId,
    projectId: $project.get()?.id,
  },
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

export const executeRuntimeMutation = <Id extends BuilderRuntimeOperationId>({
  id,
  input,
}: {
  id: Id;
  input: BuilderRuntimeOperationInput<Id>;
}): RuntimeMutationResult<Id> | undefined => {
  if (canCommitWebstudioData() === false) {
    return;
  }
  const operationResult = executeBuilderRuntimeOperation<
    RuntimeMutationResult<Id>
  >(createRuntimeMutationArgs({ id, input }));
  if (operationResult instanceof Promise) {
    throw Error(`Builder runtime operation "${id}" must be synchronous.`);
  }
  return commitRuntimeMutation(operationResult);
};

export const executeRuntimeMutationAsync = async <
  Id extends BuilderRuntimeOperationId,
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
  const pages = $pages.get();
  if (pages === undefined) {
    throw Error(`Cannot get webstudio data with empty pages`);
  }
  const projectSettings = $projectSettings.get() ?? { meta: {}, compiler: {} };
  return {
    pages,
    instances: $instances.get(),
    props: $props.get(),
    dataSources: $dataSources.get(),
    resources: $resources.get(),
    breakpoints: $breakpoints.get(),
    styleSourceSelections: $styleSourceSelections.get(),
    styleSources: $styleSources.get(),
    styles: $styles.get(),
    assets: $assets.get(),
    marketplaceProduct: $marketplaceProduct.get(),
    projectSettings,
  };
};
