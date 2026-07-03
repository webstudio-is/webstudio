import type { RuntimeOperationId } from "../contracts/builder-runtime";
import type { BuilderState } from "../state/builder-state";
import type { BuilderRuntimeContext } from "./context";
import * as assets from "./assets";
import * as data from "./data";
import * as instances from "./instances";
import * as pageCopy from "./page-copy";
import * as pages from "./pages";
import * as projectSettings from "./project-settings";
import * as props from "./props";
import * as styles from "./styles";

export type BuilderRuntimeOperation<Input = unknown, Result = unknown> = {
  id: RuntimeOperationId;
  execute: (args: {
    state: BuilderState;
    input: Input;
    context: BuilderRuntimeContext;
  }) => Result;
};

const runtimeOperation = <Input, Result>(
  id: RuntimeOperationId,
  execute: BuilderRuntimeOperation<Input, Result>["execute"]
): BuilderRuntimeOperation<Input, Result> => ({ id, execute });

export const builderRuntimeOperations = [
  runtimeOperation("pages.list", ({ state, input }) =>
    pages.listPages(state, input as Parameters<typeof pages.listPages>[1])
  ),
  runtimeOperation("pages.get", ({ state, input }) =>
    pages.getPage(state, input as Parameters<typeof pages.getPage>[1])
  ),
  runtimeOperation("pages.getByPath", ({ state, input }) =>
    pages.getPageByPath(
      state,
      input as Parameters<typeof pages.getPageByPath>[1]
    )
  ),
  runtimeOperation("pages.create", ({ state, input, context }) =>
    pages.createPage(state, pages.pageCreateInput.parse(input), context)
  ),
  runtimeOperation("pages.update", ({ state, input }) =>
    pages.updatePage(state, pages.pageUpdateInput.parse(input))
  ),
  runtimeOperation("projectSettings.get", ({ state }) =>
    projectSettings.getProjectSettings(state)
  ),
  runtimeOperation("projectSettings.update", ({ state, input }) =>
    projectSettings.updateProjectSettings(
      state,
      projectSettings.projectSettingsUpdateInput.parse(input)
    )
  ),
  runtimeOperation("redirects.list", ({ state }) =>
    projectSettings.listRedirects(state)
  ),
  runtimeOperation("redirects.create", ({ state, input }) =>
    projectSettings.createRedirect(
      state,
      projectSettings.redirectCreateInput.parse(input)
    )
  ),
  runtimeOperation("redirects.update", ({ state, input }) =>
    projectSettings.updateRedirect(
      state,
      projectSettings.redirectUpdateInput.parse(input)
    )
  ),
  runtimeOperation("redirects.delete", ({ state, input }) =>
    projectSettings.deleteRedirect(
      state,
      projectSettings.redirectDeleteInput.parse(input)
    )
  ),
  runtimeOperation("breakpoints.list", ({ state }) =>
    projectSettings.listBreakpoints(state)
  ),
  runtimeOperation("breakpoints.create", ({ state, input }) =>
    projectSettings.createBreakpoint(
      state,
      projectSettings.breakpointCreateInput.parse(input)
    )
  ),
  runtimeOperation("breakpoints.update", ({ state, input }) =>
    projectSettings.updateBreakpoint(
      state,
      projectSettings.breakpointUpdateInput.parse(input)
    )
  ),
  runtimeOperation("breakpoints.delete", ({ state, input }) =>
    projectSettings.deleteBreakpoint(
      state,
      projectSettings.breakpointDeleteInput.parse(input)
    )
  ),
  runtimeOperation("pages.delete", ({ state, input }) =>
    pages.deletePage(state, pages.pageDeleteInput.parse(input))
  ),
  runtimeOperation("pages.duplicate", ({ state, input, context }) =>
    pageCopy.duplicatePage(
      state,
      pageCopy.pageDuplicateInput.parse(input),
      context
    )
  ),
  runtimeOperation("pageTemplates.list", ({ state }) =>
    pageCopy.listPageTemplates(state)
  ),
  runtimeOperation("pageTemplates.createPage", ({ state, input, context }) =>
    pageCopy.createPageFromTemplate(
      state,
      pageCopy.pageTemplateCreatePageInput.parse(input),
      context
    )
  ),
  runtimeOperation("folders.list", ({ state, input }) =>
    pages.listFolders(state, input as Parameters<typeof pages.listFolders>[1])
  ),
  runtimeOperation("folders.create", ({ state, input, context }) =>
    pages.createFolder(state, pages.folderCreateInput.parse(input), context)
  ),
  runtimeOperation("folders.update", ({ state, input }) =>
    pages.updateFolder(state, pages.folderUpdateInput.parse(input))
  ),
  runtimeOperation("folders.delete", ({ state, input }) =>
    pages.deleteFolder(state, pages.folderDeleteInput.parse(input))
  ),
  runtimeOperation("instances.list", ({ state, input }) =>
    instances.listInstances(
      state,
      input as Parameters<typeof instances.listInstances>[1]
    )
  ),
  runtimeOperation("instances.inspect", ({ state, input }) =>
    instances.inspectInstance(
      state,
      input as Parameters<typeof instances.inspectInstance>[1]
    )
  ),
  runtimeOperation("instances.append", ({ state, input, context }) =>
    instances.appendInstances(
      state,
      instances.appendInstancesInput.parse(input),
      context
    )
  ),
  runtimeOperation("instances.move", ({ state, input }) =>
    instances.moveInstances(state, instances.moveInstancesInput.parse(input))
  ),
  runtimeOperation("instances.clone", ({ state, input, context }) =>
    instances.cloneInstance(
      state,
      instances.cloneInstanceInput.parse(input),
      context
    )
  ),
  runtimeOperation("instances.delete", ({ state, input }) =>
    instances.deleteInstances(
      state,
      instances.deleteInstancesInput.parse(input)
    )
  ),
  runtimeOperation("instances.updateProps", ({ state, input, context }) =>
    props.updateProps(state, props.propUpdatesInput.parse(input), context)
  ),
  runtimeOperation("instances.deleteProps", ({ state, input }) =>
    props.deleteProps(state, props.propDeletionsInput.parse(input))
  ),
  runtimeOperation("instances.bindProps", ({ state, input, context }) =>
    props.bindProps(state, props.propBindingsInput.parse(input), context)
  ),
  runtimeOperation("instances.listTexts", ({ state, input }) =>
    instances.listTextInstances(
      state,
      input as Parameters<typeof instances.listTextInstances>[1]
    )
  ),
  runtimeOperation("instances.updateText", ({ state, input }) =>
    instances.updateTextInstance(
      state,
      instances.updateTextInstanceInput.parse(input)
    )
  ),
  runtimeOperation("styles.getDeclarations", ({ state, input }) =>
    styles.getStyleDeclarations(
      state,
      input as Parameters<typeof styles.getStyleDeclarations>[1]
    )
  ),
  runtimeOperation("styles.updateDeclarations", ({ state, input, context }) =>
    styles.updateStyleDeclarations(
      state,
      styles.styleUpdateDeclarationsInput.parse(input),
      context
    )
  ),
  runtimeOperation("styles.deleteDeclarations", ({ state, input }) =>
    styles.deleteStyleDeclarations(
      state,
      styles.styleDeleteDeclarationsInput.parse(input)
    )
  ),
  runtimeOperation("styles.replaceValues", ({ state, input }) =>
    styles.replaceStyleValues(state, styles.styleReplaceInput.parse(input))
  ),
  runtimeOperation("designTokens.list", ({ state, input }) =>
    styles.listDesignTokens(
      state,
      input as Parameters<typeof styles.listDesignTokens>[1]
    )
  ),
  runtimeOperation("designTokens.create", ({ state, input, context }) =>
    styles.createDesignTokens(
      state,
      styles.designTokenCreateManyInput.parse(input),
      context
    )
  ),
  runtimeOperation("designTokens.updateStyles", ({ state, input }) =>
    styles.updateDesignTokenStyles(
      state,
      styles.designTokenStyleUpdatesInput.parse(input)
    )
  ),
  runtimeOperation("designTokens.deleteStyles", ({ state, input }) =>
    styles.deleteDesignTokenStyles(
      state,
      styles.designTokenStyleDeletionsInput.parse(input)
    )
  ),
  runtimeOperation("designTokens.attach", ({ state, input }) =>
    styles.attachDesignToken(state, styles.designTokenAttachInput.parse(input))
  ),
  runtimeOperation("designTokens.detach", ({ state, input }) =>
    styles.detachDesignToken(state, styles.designTokenDetachInput.parse(input))
  ),
  runtimeOperation("designTokens.extract", ({ state, input, context }) =>
    styles.extractDesignToken(
      state,
      styles.designTokenExtractInput.parse(input),
      context
    )
  ),
  runtimeOperation("cssVariables.list", ({ state, input }) =>
    styles.listCssVariables(
      state,
      input as Parameters<typeof styles.listCssVariables>[1]
    )
  ),
  runtimeOperation("cssVariables.define", ({ state, input, context }) =>
    styles.defineCssVariables(
      state,
      styles.cssVariableDefineInput.parse(input),
      context
    )
  ),
  runtimeOperation("cssVariables.delete", ({ state, input }) =>
    styles.deleteCssVariables(state, styles.cssVariableDeleteInput.parse(input))
  ),
  runtimeOperation("cssVariables.rewriteRefs", ({ state, input }) =>
    styles.rewriteCssVariableRefs(
      state,
      styles.cssVariableRewriteRefsInput.parse(input)
    )
  ),
  runtimeOperation("variables.list", ({ state, input }) =>
    data.listDataVariables(
      state,
      input as Parameters<typeof data.listDataVariables>[1]
    )
  ),
  runtimeOperation("variables.create", ({ state, input, context }) =>
    data.createDataVariable(
      state,
      data.dataVariableCreateInput.parse(input),
      context
    )
  ),
  runtimeOperation("variables.update", ({ state, input }) =>
    data.updateDataVariable(state, data.dataVariableUpdateInput.parse(input))
  ),
  runtimeOperation("variables.delete", ({ state, input }) =>
    data.deleteDataVariable(state, data.dataVariableDeleteInput.parse(input))
  ),
  runtimeOperation("resources.list", ({ state, input }) =>
    data.listResources(state, input as Parameters<typeof data.listResources>[1])
  ),
  runtimeOperation("resources.create", ({ state, input, context }) =>
    data.createResource(state, data.resourceCreateInput.parse(input), context)
  ),
  runtimeOperation("resources.update", ({ state, input }) =>
    data.updateResource(state, data.resourceUpdateInput.parse(input))
  ),
  runtimeOperation("resources.delete", ({ state, input }) =>
    data.deleteResource(state, data.resourceDeleteInput.parse(input))
  ),
  runtimeOperation("assets.list", ({ state, input }) =>
    assets.listAssets(state, input as Parameters<typeof assets.listAssets>[1])
  ),
  runtimeOperation("assets.findUsage", ({ state, input }) =>
    assets.findAssetUsage(
      state,
      input as Parameters<typeof assets.findAssetUsage>[1]
    )
  ),
  runtimeOperation("assets.replace", ({ state, input }) =>
    assets.replaceAsset(state, assets.assetReplaceInput.parse(input))
  ),
  runtimeOperation("assets.delete", ({ state, input }) =>
    assets.deleteAssets(state, assets.assetDeleteInput.parse(input))
  ),
] as const satisfies readonly BuilderRuntimeOperation[];

const builderRuntimeOperationById: ReadonlyMap<
  string,
  BuilderRuntimeOperation
> = new Map(
  builderRuntimeOperations.map((operation) => [operation.id, operation])
);

export const getBuilderRuntimeOperation = (id: string) => {
  const operation = builderRuntimeOperationById.get(id);
  if (operation === undefined) {
    throw new Error(`Unknown builder runtime operation "${id}".`);
  }
  return operation;
};

export const executeBuilderRuntimeOperation = <Result = unknown>({
  id,
  state,
  input,
  context,
}: {
  id: string;
  state: BuilderState;
  input: unknown;
  context: BuilderRuntimeContext;
}): Result => {
  return getBuilderRuntimeOperation(id).execute({
    state,
    input,
    context,
  }) as Result;
};
