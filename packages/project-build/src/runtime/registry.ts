import type { BuilderState } from "../state/builder-state";
import type { BuilderNamespace } from "../contracts/namespaces";
import type { BuilderApiCapability } from "../contracts/permissions";
import {
  getInputSchemaMetadata,
  isHiddenPublicApiInputField,
} from "../contracts/input-schema";
import { builderRuntimeContext, type BuilderRuntimeContext } from "./context";
import { z } from "zod";
import * as assets from "./assets";
import * as data from "./data";
import * as instances from "./instances";
import * as pageCopy from "./page-copy";
import * as pages from "./pages";
import * as projectSettings from "./project-settings";
import * as props from "./props";
import * as styles from "./styles";

export type BuilderRuntimeOperation<
  Id extends string = string,
  Result = unknown,
> = {
  id: Id;
  command: string;
  client: string;
  permit?: BuilderApiCapability;
  kind: "read" | "mutation";
  inputSchema: z.ZodTypeAny;
  inputFields: readonly string[];
  requiredInputFields: readonly string[];
  inputFieldTypes: Partial<Record<string, "array">>;
  readNamespaces: readonly BuilderNamespace[];
  writeNamespaces: readonly BuilderNamespace[];
  invalidatesNamespaces: readonly BuilderNamespace[];
  retryOnConflict: boolean;
  requiresAssets: boolean;
  requiresConfirm: boolean;
  execute: (args: {
    state: BuilderState;
    input: unknown;
    context: BuilderRuntimeContext;
  }) => Result;
};

type RuntimeOperationPublicApi = {
  command: string;
  client: string;
  permit?: BuilderApiCapability;
};

type RuntimeOperationContractInput =
  | {
      kind: "read";
      readNamespaces: readonly BuilderNamespace[];
      requiresAssets?: boolean;
    }
  | {
      kind: "mutation";
      readNamespaces: readonly BuilderNamespace[];
      writeNamespaces: readonly BuilderNamespace[];
      invalidatesNamespaces?: readonly BuilderNamespace[];
      retryOnConflict?: boolean;
      requiresAssets?: boolean;
      requiresConfirm?: boolean;
    };

const runtimeOperation = <
  Id extends string,
  Schema extends z.ZodTypeAny,
  Result,
>(
  id: Id,
  publicApi: RuntimeOperationPublicApi,
  contract: RuntimeOperationContractInput,
  inputSchema: Schema,
  execute: (args: {
    state: BuilderState;
    input: z.output<Schema>;
    context: BuilderRuntimeContext;
  }) => Result
): BuilderRuntimeOperation<Id, Result> => ({
  id,
  ...publicApi,
  kind: contract.kind,
  inputSchema,
  ...getInputSchemaMetadata(inputSchema, {
    isHiddenField: isHiddenPublicApiInputField,
  }),
  readNamespaces: contract.readNamespaces,
  writeNamespaces: contract.kind === "mutation" ? contract.writeNamespaces : [],
  invalidatesNamespaces:
    contract.kind === "mutation"
      ? (contract.invalidatesNamespaces ?? contract.writeNamespaces)
      : [],
  retryOnConflict:
    contract.kind === "mutation" ? (contract.retryOnConflict ?? false) : false,
  requiresAssets: contract.requiresAssets ?? false,
  requiresConfirm:
    contract.kind === "mutation" ? (contract.requiresConfirm ?? false) : false,
  execute: ({ state, input, context }) =>
    execute({ state, input: inputSchema.parse(input ?? {}), context }),
});

const api = (
  command: string,
  client: string,
  permit?: BuilderApiCapability
): RuntimeOperationPublicApi => ({ command, client, permit });

const readContract = (
  readNamespaces: readonly BuilderNamespace[],
  options: { requiresAssets?: boolean } = {}
): RuntimeOperationContractInput => ({
  kind: "read",
  readNamespaces,
  ...options,
});

const mutationContract = (input: {
  readNamespaces: readonly BuilderNamespace[];
  writeNamespaces: readonly BuilderNamespace[];
  invalidatesNamespaces?: readonly BuilderNamespace[];
  retryOnConflict?: boolean;
  requiresAssets?: boolean;
  requiresConfirm?: boolean;
}): RuntimeOperationContractInput => ({ kind: "mutation", ...input });

const pageNamespaces = ["pages", "instances"] as const;
const instanceReadNamespaces = ["pages", "instances", "props"] as const;
const styleNamespaces = [
  "styles",
  "styleSources",
  "styleSourceSelections",
] as const;
const dataNamespaces = ["dataSources", "resources"] as const;
const treeMutationNamespaces = [
  "pages",
  "instances",
  "props",
  ...dataNamespaces,
  ...styleNamespaces,
] as const;
const assetUsageNamespaces = [
  "assets",
  "pages",
  "props",
  "styles",
  "resources",
  "dataSources",
] as const;
const pageCopyNamespaces = [
  "pages",
  "assets",
  "dataSources",
  "resources",
  "instances",
  "props",
  "breakpoints",
  "styles",
  "styleSources",
  "styleSourceSelections",
] as const;

const emptyInput = z.object({});
const pageListInput = z.object({ includeFolders: z.boolean().optional() });
const pageGetInput = z.object({ pageId: z.string() });
const pageGetByPathInput = z.object({ path: z.string() });
const folderListInput = z.object({ includePages: z.boolean().optional() });
const instanceListInput = z.object({
  pageId: z.string().optional(),
  pagePath: z.string().optional(),
  rootInstanceId: z.string().optional(),
  maxDepth: z.number().int().nonnegative().optional(),
  topLevelOnly: z.boolean().optional(),
  component: z.string().optional(),
  tag: z.string().optional(),
  labelContains: z.string().optional(),
});
const instanceInspectInput = z.object({
  instanceId: z.string(),
  include: z
    .array(z.enum(["props", "styles", "bindings", "children", "sources"]))
    .optional(),
  childDepth: z.number().int().optional(),
});
const textListInput = z.object({
  pageId: z.string().optional(),
  pagePath: z.string().optional(),
  instanceId: z.string().optional(),
  mode: z.enum(["text", "expression", "all"]).optional(),
  contains: z.string().optional(),
  maxValueLength: z.number().int().nonnegative().optional(),
});
const styleDeclarationsListInput = z.object({
  instanceIds: z.array(z.string()).optional(),
  pageId: z.string().optional(),
  pagePath: z.string().optional(),
  breakpoint: z.string().optional(),
  state: z.string().optional(),
  property: z.string().optional(),
  propertyFilter: z.string().optional(),
  includeTokens: z.boolean().optional(),
});
const designTokenListInput = z.object({
  filter: z.string().optional(),
  withUsage: z.boolean().optional(),
  sort: z.enum(["name", "usage"]).optional(),
});
const cssVariableListInput = z.object({
  filter: z.string().optional(),
  withUsage: z.boolean().optional(),
});
const scopedInstanceListInput = z.object({
  scopeInstanceId: z.string().optional(),
});
const assetListInput = z.object({
  type: z.enum(["image", "font"]).optional(),
  sort: z.enum(["name", "size", "createdAt", "usage"]).optional(),
  withUsage: z.boolean().optional(),
  cursor: z.string().optional(),
  limit: z.number().int().min(1).optional(),
});
const assetUsageInput = z.object({ assetId: z.string() });

export const builderRuntimeOperations = [
  runtimeOperation(
    "pages.list",
    api("list-pages", "listPages"),
    readContract(["pages"]),
    pageListInput,
    ({ state, input }) => pages.listPages(state, input)
  ),
  runtimeOperation(
    "pages.get",
    api("get-page", "getPage"),
    readContract(pageNamespaces),
    pageGetInput,
    ({ state, input }) => pages.getPage(state, input)
  ),
  runtimeOperation(
    "pages.getByPath",
    api("get-page-by-path", "getPageByPath"),
    readContract(pageNamespaces),
    pageGetByPathInput,
    ({ state, input }) => pages.getPageByPath(state, input)
  ),
  runtimeOperation(
    "pages.create",
    api("create-page", "createPage"),
    mutationContract({
      readNamespaces: ["pages"],
      writeNamespaces: pageNamespaces,
    }),
    pages.pageCreateInput,
    ({ state, input, context }) => pages.createPage(state, input, context)
  ),
  runtimeOperation(
    "pages.update",
    api("update-page", "updatePage"),
    mutationContract({
      readNamespaces: ["pages"],
      writeNamespaces: ["pages"],
      retryOnConflict: true,
    }),
    pages.pageUpdateInput,
    ({ state, input }) => pages.updatePage(state, input)
  ),
  runtimeOperation(
    "projectSettings.get",
    api("get-project-settings", "getProjectSettings"),
    readContract(["pages"]),
    emptyInput,
    ({ state }) => projectSettings.getProjectSettings(state)
  ),
  runtimeOperation(
    "projectSettings.update",
    api("update-project-settings", "updateProjectSettings"),
    mutationContract({
      readNamespaces: ["pages"],
      writeNamespaces: ["pages"],
      retryOnConflict: true,
    }),
    projectSettings.projectSettingsUpdateInput,
    ({ state, input }) => projectSettings.updateProjectSettings(state, input)
  ),
  runtimeOperation(
    "redirects.list",
    api("list-redirects", "listRedirects"),
    readContract(["pages"]),
    emptyInput,
    ({ state }) => projectSettings.listRedirects(state)
  ),
  runtimeOperation(
    "redirects.create",
    api("create-redirect", "createRedirect"),
    mutationContract({
      readNamespaces: ["pages"],
      writeNamespaces: ["pages"],
      retryOnConflict: true,
    }),
    projectSettings.redirectCreateInput,
    ({ state, input }) => projectSettings.createRedirect(state, input)
  ),
  runtimeOperation(
    "redirects.update",
    api("update-redirect", "updateRedirect"),
    mutationContract({
      readNamespaces: ["pages"],
      writeNamespaces: ["pages"],
      retryOnConflict: true,
    }),
    projectSettings.redirectUpdateInput,
    ({ state, input }) => projectSettings.updateRedirect(state, input)
  ),
  runtimeOperation(
    "redirects.delete",
    api("delete-redirect", "deleteRedirect"),
    mutationContract({
      readNamespaces: ["pages"],
      writeNamespaces: ["pages"],
      retryOnConflict: true,
    }),
    projectSettings.redirectDeleteInput,
    ({ state, input }) => projectSettings.deleteRedirect(state, input)
  ),
  runtimeOperation(
    "breakpoints.list",
    api("list-breakpoints", "listBreakpoints"),
    readContract(["breakpoints"]),
    emptyInput,
    ({ state }) => projectSettings.listBreakpoints(state)
  ),
  runtimeOperation(
    "breakpoints.create",
    api("create-breakpoint", "createBreakpoint"),
    mutationContract({
      readNamespaces: ["breakpoints"],
      writeNamespaces: ["breakpoints"],
      retryOnConflict: true,
    }),
    projectSettings.breakpointCreateInput,
    ({ state, input, context }) =>
      projectSettings.createBreakpoint(state, input, context)
  ),
  runtimeOperation(
    "breakpoints.update",
    api("update-breakpoint", "updateBreakpoint"),
    mutationContract({
      readNamespaces: ["breakpoints"],
      writeNamespaces: ["breakpoints"],
      retryOnConflict: true,
    }),
    projectSettings.breakpointUpdateInput,
    ({ state, input }) => projectSettings.updateBreakpoint(state, input)
  ),
  runtimeOperation(
    "breakpoints.delete",
    api("delete-breakpoint", "deleteBreakpoint"),
    mutationContract({
      readNamespaces: ["breakpoints", "styles"],
      writeNamespaces: ["breakpoints", "styles"],
      retryOnConflict: true,
    }),
    projectSettings.breakpointDeleteInput,
    ({ state, input }) => projectSettings.deleteBreakpoint(state, input)
  ),
  runtimeOperation(
    "pages.delete",
    api("delete-page", "deletePage"),
    mutationContract({
      readNamespaces: treeMutationNamespaces,
      writeNamespaces: treeMutationNamespaces,
    }),
    pages.pageDeleteInput,
    ({ state, input }) => pages.deletePage(state, input)
  ),
  runtimeOperation(
    "pages.duplicate",
    api("duplicate-page", "duplicatePage"),
    mutationContract({
      readNamespaces: pageCopyNamespaces,
      writeNamespaces: pageCopyNamespaces,
    }),
    pageCopy.pageDuplicateInput,
    ({ state, input, context }) => pageCopy.duplicatePage(state, input, context)
  ),
  runtimeOperation(
    "pageTemplates.list",
    api("list-page-templates", "listPageTemplates"),
    readContract(["pages"]),
    emptyInput,
    ({ state }) => pageCopy.listPageTemplates(state)
  ),
  runtimeOperation(
    "pageTemplates.createPage",
    api("create-page-from-template", "createPageFromTemplate"),
    mutationContract({
      readNamespaces: pageCopyNamespaces,
      writeNamespaces: pageCopyNamespaces,
    }),
    pageCopy.pageTemplateCreatePageInput,
    ({ state, input, context }) =>
      pageCopy.createPageFromTemplate(state, input, context)
  ),
  runtimeOperation(
    "folders.list",
    api("list-folders", "listFolders"),
    readContract(["pages"]),
    folderListInput,
    ({ state, input }) => pages.listFolders(state, input)
  ),
  runtimeOperation(
    "folders.create",
    api("create-folder", "createFolder"),
    mutationContract({
      readNamespaces: ["pages"],
      writeNamespaces: ["pages"],
    }),
    pages.folderCreateInput,
    ({ state, input, context }) => pages.createFolder(state, input, context)
  ),
  runtimeOperation(
    "folders.update",
    api("update-folder", "updateFolder"),
    mutationContract({
      readNamespaces: ["pages"],
      writeNamespaces: ["pages"],
      retryOnConflict: true,
    }),
    pages.folderUpdateInput,
    ({ state, input }) => pages.updateFolder(state, input)
  ),
  runtimeOperation(
    "folders.delete",
    api("delete-folder", "deleteFolder"),
    mutationContract({
      readNamespaces: treeMutationNamespaces,
      writeNamespaces: treeMutationNamespaces,
    }),
    pages.folderDeleteInput,
    ({ state, input }) => pages.deleteFolder(state, input)
  ),
  runtimeOperation(
    "instances.list",
    api("list-instances", "listInstances"),
    readContract(instanceReadNamespaces),
    instanceListInput,
    ({ state, input }) => instances.listInstances(state, input)
  ),
  runtimeOperation(
    "instances.inspect",
    api("inspect-instance", "inspectInstance"),
    readContract([
      "instances",
      "props",
      "styles",
      "styleSources",
      "styleSourceSelections",
    ]),
    instanceInspectInput,
    ({ state, input }) => instances.inspectInstance(state, input)
  ),
  runtimeOperation(
    "instances.append",
    api("append-instance", "appendInstance"),
    mutationContract({
      readNamespaces: treeMutationNamespaces,
      writeNamespaces: treeMutationNamespaces,
    }),
    instances.appendInstancesInput,
    ({ state, input, context }) =>
      instances.appendInstances(state, input, context)
  ),
  runtimeOperation(
    "instances.move",
    api("move-instance", "moveInstance"),
    mutationContract({
      readNamespaces: ["instances"],
      writeNamespaces: ["instances"],
    }),
    instances.moveInstancesInput,
    ({ state, input }) => instances.moveInstances(state, input)
  ),
  runtimeOperation(
    "instances.clone",
    api("clone-instance", "cloneInstance"),
    mutationContract({
      readNamespaces: treeMutationNamespaces,
      writeNamespaces: treeMutationNamespaces,
    }),
    instances.cloneInstanceInput,
    ({ state, input, context }) =>
      instances.cloneInstance(state, input, context)
  ),
  runtimeOperation(
    "instances.delete",
    api("delete-instance", "deleteInstance"),
    mutationContract({
      readNamespaces: treeMutationNamespaces,
      writeNamespaces: treeMutationNamespaces,
    }),
    instances.deleteInstancesInput,
    ({ state, input }) => instances.deleteInstances(state, input)
  ),
  runtimeOperation(
    "instances.updateProps",
    api("update-props", "updateProps", "edit"),
    mutationContract({
      readNamespaces: ["instances", "props"],
      writeNamespaces: ["props"],
    }),
    props.propUpdatesInput,
    ({ state, input, context }) => props.updateProps(state, input, context)
  ),
  runtimeOperation(
    "instances.deleteProps",
    api("delete-props", "deleteProps", "edit"),
    mutationContract({
      readNamespaces: ["instances", "props"],
      writeNamespaces: ["props", "resources"],
    }),
    props.propDeletionsInput,
    ({ state, input }) => props.deleteProps(state, input)
  ),
  runtimeOperation(
    "instances.bindProps",
    api("bind-props", "bindProps"),
    mutationContract({
      readNamespaces: ["instances", "props", ...dataNamespaces],
      writeNamespaces: ["props"],
    }),
    props.propBindingsInput,
    ({ state, input, context }) => props.bindProps(state, input, context)
  ),
  runtimeOperation(
    "instances.listTexts",
    api("list-texts", "listTexts"),
    readContract(["pages", "instances"]),
    textListInput,
    ({ state, input }) => instances.listTextInstances(state, input)
  ),
  runtimeOperation(
    "instances.updateText",
    api("update-text", "updateText", "edit"),
    mutationContract({
      readNamespaces: ["instances"],
      writeNamespaces: ["instances"],
      retryOnConflict: true,
    }),
    instances.updateTextInstanceInput,
    ({ state, input }) => instances.updateTextInstance(state, input)
  ),
  runtimeOperation(
    "styles.getDeclarations",
    api("get-styles", "getStyleDeclarations"),
    readContract(["instances", ...styleNamespaces, "breakpoints"]),
    styleDeclarationsListInput,
    ({ state, input }) => styles.getStyleDeclarations(state, input)
  ),
  runtimeOperation(
    "styles.updateDeclarations",
    api("update-styles", "updateStyleDeclarations"),
    mutationContract({
      readNamespaces: ["instances", ...styleNamespaces, "breakpoints"],
      writeNamespaces: ["styles", "styleSources", "styleSourceSelections"],
    }),
    styles.styleUpdateDeclarationsInput,
    ({ state, input, context }) =>
      styles.updateStyleDeclarations(state, input, context)
  ),
  runtimeOperation(
    "styles.deleteDeclarations",
    api("delete-styles", "deleteStyleDeclarations"),
    mutationContract({
      readNamespaces: ["instances", ...styleNamespaces, "breakpoints"],
      writeNamespaces: ["styles"],
    }),
    styles.styleDeleteDeclarationsInput,
    ({ state, input }) => styles.deleteStyleDeclarations(state, input)
  ),
  runtimeOperation(
    "styles.replaceValues",
    api("replace-styles", "replaceStyleValues"),
    mutationContract({
      readNamespaces: ["pages", "instances", ...styleNamespaces],
      writeNamespaces: ["styles"],
    }),
    styles.styleReplaceInput,
    ({ state, input }) => styles.replaceStyleValues(state, input)
  ),
  runtimeOperation(
    "designTokens.list",
    api("list-design-tokens", "listDesignTokens"),
    readContract(styleNamespaces),
    designTokenListInput,
    ({ state, input }) => styles.listDesignTokens(state, input)
  ),
  runtimeOperation(
    "designTokens.create",
    api("create-design-token", "createDesignTokens"),
    mutationContract({
      readNamespaces: [...styleNamespaces, "breakpoints"],
      writeNamespaces: ["styleSources", "styles"],
    }),
    styles.designTokenCreateManyInput,
    ({ state, input, context }) =>
      styles.createDesignTokens(state, input, context)
  ),
  runtimeOperation(
    "designTokens.updateStyles",
    api("update-design-token-styles", "updateDesignTokenStyles"),
    mutationContract({
      readNamespaces: [...styleNamespaces, "breakpoints"],
      writeNamespaces: ["styles", "styleSources"],
    }),
    styles.designTokenStyleUpdatesInput,
    ({ state, input }) => styles.updateDesignTokenStyles(state, input)
  ),
  runtimeOperation(
    "designTokens.deleteStyles",
    api("delete-design-token-styles", "deleteDesignTokenStyles"),
    mutationContract({
      readNamespaces: [...styleNamespaces, "breakpoints"],
      writeNamespaces: ["styles"],
    }),
    styles.designTokenStyleDeletionsInput,
    ({ state, input }) => styles.deleteDesignTokenStyles(state, input)
  ),
  runtimeOperation(
    "designTokens.attach",
    api("attach-design-token", "attachDesignToken"),
    mutationContract({
      readNamespaces: ["instances", ...styleNamespaces],
      writeNamespaces: ["styleSourceSelections"],
    }),
    styles.designTokenAttachInput,
    ({ state, input }) => styles.attachDesignToken(state, input)
  ),
  runtimeOperation(
    "designTokens.detach",
    api("detach-design-token", "detachDesignToken"),
    mutationContract({
      readNamespaces: ["instances", ...styleNamespaces],
      writeNamespaces: ["styleSourceSelections"],
    }),
    styles.designTokenDetachInput,
    ({ state, input }) => styles.detachDesignToken(state, input)
  ),
  runtimeOperation(
    "designTokens.extract",
    api("extract-design-token", "extractDesignToken"),
    mutationContract({
      readNamespaces: ["instances", ...styleNamespaces],
      writeNamespaces: ["styles", "styleSources", "styleSourceSelections"],
    }),
    styles.designTokenExtractInput,
    ({ state, input, context }) =>
      styles.extractDesignToken(state, input, context)
  ),
  runtimeOperation(
    "cssVariables.list",
    api("list-css-variables", "listCssVariables"),
    readContract([...styleNamespaces, "props"]),
    cssVariableListInput,
    ({ state, input }) => styles.listCssVariables(state, input)
  ),
  runtimeOperation(
    "cssVariables.define",
    api("define-css-variable", "defineCssVariables"),
    mutationContract({
      readNamespaces: ["pages", ...styleNamespaces, "breakpoints"],
      writeNamespaces: ["styles", "styleSources", "styleSourceSelections"],
    }),
    styles.cssVariableDefineInput,
    ({ state, input, context }) =>
      styles.defineCssVariables(state, input, context)
  ),
  runtimeOperation(
    "cssVariables.delete",
    api("delete-css-variable", "deleteCssVariables"),
    mutationContract({
      readNamespaces: [...styleNamespaces, "props"],
      writeNamespaces: ["styles"],
      requiresConfirm: true,
    }),
    styles.cssVariableDeleteInput,
    ({ state, input }) => styles.deleteCssVariables(state, input)
  ),
  runtimeOperation(
    "cssVariables.rewriteRefs",
    api("rewrite-css-variable-refs", "rewriteCssVariableRefs"),
    mutationContract({
      readNamespaces: [...styleNamespaces, "props"],
      writeNamespaces: ["styles", "props"],
    }),
    styles.cssVariableRewriteRefsInput,
    ({ state, input }) => styles.rewriteCssVariableRefs(state, input)
  ),
  runtimeOperation(
    "variables.list",
    api("list-variables", "listVariables"),
    readContract(["dataSources"]),
    scopedInstanceListInput,
    ({ state, input }) => data.listDataVariables(state, input)
  ),
  runtimeOperation(
    "variables.create",
    api("create-variable", "createVariable"),
    mutationContract({
      readNamespaces: ["dataSources", "instances"],
      writeNamespaces: ["dataSources"],
    }),
    data.dataVariableCreateInput,
    ({ state, input, context }) =>
      data.createDataVariable(state, input, context)
  ),
  runtimeOperation(
    "variables.update",
    api("update-variable", "updateVariable"),
    mutationContract({
      readNamespaces: ["dataSources"],
      writeNamespaces: ["dataSources"],
      retryOnConflict: true,
    }),
    data.dataVariableUpdateInput,
    ({ state, input }) => data.updateDataVariable(state, input)
  ),
  runtimeOperation(
    "variables.delete",
    api("delete-variable", "deleteVariable"),
    mutationContract({
      readNamespaces: ["pages", "instances", "props", ...dataNamespaces],
      writeNamespaces: ["pages", "instances", "props", ...dataNamespaces],
    }),
    data.dataVariableDeleteInput,
    ({ state, input }) => data.deleteDataVariable(state, input)
  ),
  runtimeOperation(
    "resources.list",
    api("list-resources", "listResources"),
    readContract(dataNamespaces),
    scopedInstanceListInput,
    ({ state, input }) => data.listResources(state, input)
  ),
  runtimeOperation(
    "resources.create",
    api("create-resource", "createResource"),
    mutationContract({
      readNamespaces: [
        "pages",
        "instances",
        "props",
        ...dataNamespaces,
        ...styleNamespaces,
        "breakpoints",
      ],
      writeNamespaces: [
        "pages",
        "instances",
        "props",
        ...dataNamespaces,
        ...styleNamespaces,
        "breakpoints",
      ],
    }),
    data.resourceCreateInput,
    ({ state, input, context }) => data.createResource(state, input, context)
  ),
  runtimeOperation(
    "resources.update",
    api("update-resource", "updateResource"),
    mutationContract({
      readNamespaces: [
        "pages",
        "instances",
        "props",
        ...dataNamespaces,
        ...styleNamespaces,
        "breakpoints",
      ],
      writeNamespaces: [
        "pages",
        "instances",
        "props",
        ...dataNamespaces,
        ...styleNamespaces,
        "breakpoints",
      ],
    }),
    data.resourceUpdateInput,
    ({ state, input }) => data.updateResource(state, input)
  ),
  runtimeOperation(
    "resources.delete",
    api("delete-resource", "deleteResource"),
    mutationContract({
      readNamespaces: [...dataNamespaces, "props"],
      writeNamespaces: [...dataNamespaces, "props"],
    }),
    data.resourceDeleteInput,
    ({ state, input }) => data.deleteResource(state, input)
  ),
  runtimeOperation(
    "assets.list",
    api("list-assets", "listAssets"),
    readContract(assetUsageNamespaces, { requiresAssets: true }),
    assetListInput,
    ({ state, input }) => assets.listAssets(state, input)
  ),
  runtimeOperation(
    "assets.findUsage",
    api("find-asset-usage", "findAssetUsage"),
    readContract(assetUsageNamespaces, { requiresAssets: true }),
    assetUsageInput,
    ({ state, input }) => assets.findAssetUsage(state, input)
  ),
  runtimeOperation(
    "assets.replace",
    api("replace-asset", "replaceAsset"),
    mutationContract({
      readNamespaces: assetUsageNamespaces,
      writeNamespaces: ["pages", "props", "styles", "assets"],
      requiresAssets: true,
    }),
    assets.assetReplaceInput,
    ({ state, input }) => assets.replaceAsset(state, input)
  ),
  runtimeOperation(
    "assets.delete",
    api("delete-asset", "deleteAssets"),
    mutationContract({
      readNamespaces: assetUsageNamespaces,
      writeNamespaces: ["assets"],
      requiresAssets: true,
    }),
    assets.assetDeleteInput,
    ({ state, input }) => assets.deleteAssets(state, input)
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

export const getBuilderRuntimeOperationInputSchema = (id: string) =>
  getBuilderRuntimeOperation(id).inputSchema;

export const executeBuilderRuntimeOperation = <Result = unknown>({
  id,
  state,
  input,
  context = builderRuntimeContext,
}: {
  id: string;
  state: BuilderState;
  input: unknown;
  context?: BuilderRuntimeContext;
}): Result => {
  return getBuilderRuntimeOperation(id).execute({
    state,
    input,
    context,
  }) as Result;
};
