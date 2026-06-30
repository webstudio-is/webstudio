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
    pages.createPage(
      state,
      input as Parameters<typeof pages.createPage>[1],
      context
    )
  ),
  runtimeOperation("pages.update", ({ state, input }) =>
    pages.updatePage(state, input as Parameters<typeof pages.updatePage>[1])
  ),
  runtimeOperation("projectSettings.get", ({ state }) =>
    projectSettings.getProjectSettings(state)
  ),
  runtimeOperation("projectSettings.update", ({ state, input }) =>
    projectSettings.updateProjectSettings(
      state,
      input as Parameters<typeof projectSettings.updateProjectSettings>[1]
    )
  ),
  runtimeOperation("redirects.list", ({ state }) =>
    projectSettings.listRedirects(state)
  ),
  runtimeOperation("redirects.create", ({ state, input }) =>
    projectSettings.createRedirect(
      state,
      input as Parameters<typeof projectSettings.createRedirect>[1]
    )
  ),
  runtimeOperation("redirects.update", ({ state, input }) =>
    projectSettings.updateRedirect(
      state,
      input as Parameters<typeof projectSettings.updateRedirect>[1]
    )
  ),
  runtimeOperation("redirects.delete", ({ state, input }) =>
    projectSettings.deleteRedirect(
      state,
      input as Parameters<typeof projectSettings.deleteRedirect>[1]
    )
  ),
  runtimeOperation("breakpoints.list", ({ state }) =>
    projectSettings.listBreakpoints(state)
  ),
  runtimeOperation("breakpoints.create", ({ state, input }) =>
    projectSettings.createBreakpoint(
      state,
      input as Parameters<typeof projectSettings.createBreakpoint>[1]
    )
  ),
  runtimeOperation("breakpoints.update", ({ state, input }) =>
    projectSettings.updateBreakpoint(
      state,
      input as Parameters<typeof projectSettings.updateBreakpoint>[1]
    )
  ),
  runtimeOperation("breakpoints.delete", ({ state, input }) =>
    projectSettings.deleteBreakpoint(
      state,
      input as Parameters<typeof projectSettings.deleteBreakpoint>[1]
    )
  ),
  runtimeOperation("pages.delete", ({ state, input }) =>
    pages.deletePage(state, input as Parameters<typeof pages.deletePage>[1])
  ),
  runtimeOperation("pages.duplicate", ({ state, input, context }) =>
    pageCopy.duplicatePage(
      state,
      input as Parameters<typeof pageCopy.duplicatePage>[1],
      context
    )
  ),
  runtimeOperation("pageTemplates.list", ({ state }) =>
    pageCopy.listPageTemplates(state)
  ),
  runtimeOperation("pageTemplates.createPage", ({ state, input, context }) =>
    pageCopy.createPageFromTemplate(
      state,
      input as Parameters<typeof pageCopy.createPageFromTemplate>[1],
      context
    )
  ),
  runtimeOperation("folders.list", ({ state, input }) =>
    pages.listFolders(state, input as Parameters<typeof pages.listFolders>[1])
  ),
  runtimeOperation("folders.create", ({ state, input, context }) =>
    pages.createFolder(
      state,
      input as Parameters<typeof pages.createFolder>[1],
      context
    )
  ),
  runtimeOperation("folders.update", ({ state, input }) =>
    pages.updateFolder(state, input as Parameters<typeof pages.updateFolder>[1])
  ),
  runtimeOperation("folders.delete", ({ state, input }) =>
    pages.deleteFolder(state, input as Parameters<typeof pages.deleteFolder>[1])
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
      input as Parameters<typeof instances.appendInstances>[1],
      context
    )
  ),
  runtimeOperation("instances.move", ({ state, input }) =>
    instances.moveInstances(
      state,
      input as Parameters<typeof instances.moveInstances>[1]
    )
  ),
  runtimeOperation("instances.clone", ({ state, input, context }) =>
    instances.cloneInstance(
      state,
      input as Parameters<typeof instances.cloneInstance>[1],
      context
    )
  ),
  runtimeOperation("instances.delete", ({ state, input }) =>
    instances.deleteInstances(
      state,
      input as Parameters<typeof instances.deleteInstances>[1]
    )
  ),
  runtimeOperation("instances.updateProps", ({ state, input, context }) =>
    props.updateProps(
      state,
      input as Parameters<typeof props.updateProps>[1],
      context
    )
  ),
  runtimeOperation("instances.deleteProps", ({ state, input }) =>
    props.deleteProps(state, input as Parameters<typeof props.deleteProps>[1])
  ),
  runtimeOperation("instances.bindProps", ({ state, input, context }) =>
    props.bindProps(
      state,
      input as Parameters<typeof props.bindProps>[1],
      context
    )
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
      input as Parameters<typeof instances.updateTextInstance>[1]
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
      input as Parameters<typeof styles.updateStyleDeclarations>[1],
      context
    )
  ),
  runtimeOperation("styles.deleteDeclarations", ({ state, input }) =>
    styles.deleteStyleDeclarations(
      state,
      input as Parameters<typeof styles.deleteStyleDeclarations>[1]
    )
  ),
  runtimeOperation("styles.replaceValues", ({ state, input }) =>
    styles.replaceStyleValues(
      state,
      input as Parameters<typeof styles.replaceStyleValues>[1]
    )
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
      input as Parameters<typeof styles.createDesignTokens>[1],
      context
    )
  ),
  runtimeOperation("designTokens.updateStyles", ({ state, input }) =>
    styles.updateDesignTokenStyles(
      state,
      input as Parameters<typeof styles.updateDesignTokenStyles>[1]
    )
  ),
  runtimeOperation("designTokens.deleteStyles", ({ state, input }) =>
    styles.deleteDesignTokenStyles(
      state,
      input as Parameters<typeof styles.deleteDesignTokenStyles>[1]
    )
  ),
  runtimeOperation("designTokens.attach", ({ state, input }) =>
    styles.attachDesignToken(
      state,
      input as Parameters<typeof styles.attachDesignToken>[1]
    )
  ),
  runtimeOperation("designTokens.detach", ({ state, input }) =>
    styles.detachDesignToken(
      state,
      input as Parameters<typeof styles.detachDesignToken>[1]
    )
  ),
  runtimeOperation("designTokens.extract", ({ state, input, context }) =>
    styles.extractDesignToken(
      state,
      input as Parameters<typeof styles.extractDesignToken>[1],
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
      input as Parameters<typeof styles.defineCssVariables>[1],
      context
    )
  ),
  runtimeOperation("cssVariables.delete", ({ state, input }) =>
    styles.deleteCssVariables(
      state,
      input as Parameters<typeof styles.deleteCssVariables>[1]
    )
  ),
  runtimeOperation("cssVariables.rewriteRefs", ({ state, input }) =>
    styles.rewriteCssVariableRefs(
      state,
      input as Parameters<typeof styles.rewriteCssVariableRefs>[1]
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
      input as Parameters<typeof data.createDataVariable>[1],
      context
    )
  ),
  runtimeOperation("variables.update", ({ state, input }) =>
    data.updateDataVariable(
      state,
      input as Parameters<typeof data.updateDataVariable>[1]
    )
  ),
  runtimeOperation("variables.delete", ({ state, input }) =>
    data.deleteDataVariable(
      state,
      input as Parameters<typeof data.deleteDataVariable>[1]
    )
  ),
  runtimeOperation("resources.list", ({ state, input }) =>
    data.listResources(state, input as Parameters<typeof data.listResources>[1])
  ),
  runtimeOperation("resources.create", ({ state, input, context }) =>
    data.createResource(
      state,
      input as Parameters<typeof data.createResource>[1],
      context
    )
  ),
  runtimeOperation("resources.update", ({ state, input }) =>
    data.updateResource(
      state,
      input as Parameters<typeof data.updateResource>[1]
    )
  ),
  runtimeOperation("resources.delete", ({ state, input }) =>
    data.deleteResource(
      state,
      input as Parameters<typeof data.deleteResource>[1]
    )
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
    assets.replaceAsset(
      state,
      input as Parameters<typeof assets.replaceAsset>[1]
    )
  ),
  runtimeOperation("assets.delete", ({ state, input }) =>
    assets.deleteAssets(
      state,
      input as Parameters<typeof assets.deleteAssets>[1]
    )
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
