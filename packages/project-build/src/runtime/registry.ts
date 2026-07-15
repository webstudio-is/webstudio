import type { BuilderState } from "../state/builder-state";
import {
  builderNamespaces,
  type BuilderNamespace,
} from "../contracts/namespaces";
import type { BuilderApiCapability } from "../contracts/permissions";
import { paginatedOutputInputSchema } from "./output";
import { getExpressionWarnings } from "./expression-validation";
import {
  getInputSchemaMetadata,
  isHiddenPublicApiInputField,
} from "../contracts/input-schema";
import { instanceFilterInput, type InputJsonSchema } from "@webstudio-is/sdk";
import { builderRuntimeContext, type BuilderRuntimeContext } from "./context";
import { z } from "zod";
import * as assets from "./assets";
import * as components from "./components";
import * as collection from "./collection";
import * as data from "./data";
import * as fonts from "./fonts";
import * as instanceDuplicate from "./instance-duplicate";
import * as instances from "./instances";
import * as migrations from "./migrations";
import * as pageCopy from "./page-copy";
import * as pages from "./pages";
import * as projectSettings from "./project-settings";
import * as props from "./props";
import * as search from "./search";
import * as audit from "./audit";
import * as styles from "./styles";
import { getZodValidationIssues, throwBuilderValidationError } from "./errors";
import {
  createRuntimeMutationExecutionSchema,
  getRuntimeOutputSchema,
  type RuntimeOperationOutput,
  type RuntimeOutputSchemaId,
} from "./output-schemas";
import type { BuilderRuntimeMutation } from "./mutation";
import { listFragmentExpressions } from "./fragment";

export type BuilderRuntimeOperation<
  Id extends string = string,
  Input = unknown,
  Result = unknown,
> = {
  id: Id;
  command: string;
  client: string;
  permit?: BuilderApiCapability;
  kind: "read" | "mutation";
  inputSchema: z.ZodTypeAny;
  inputJsonSchema: InputJsonSchema;
  outputSchema: z.ZodTypeAny;
  outputJsonSchema: InputJsonSchema;
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
  }) => Result | Promise<Result>;
  readonly __input?: Input;
  readonly __result?: Result;
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

type ReadContract = Extract<RuntimeOperationContractInput, { kind: "read" }>;
type MutationContract = Extract<
  RuntimeOperationContractInput,
  { kind: "mutation" }
>;
type RuntimeExecutionOutput<
  Id extends RuntimeOutputSchemaId,
  Contract extends RuntimeOperationContractInput,
> = Contract extends MutationContract
  ? BuilderRuntimeMutation<RuntimeOperationOutput<Id>>
  : RuntimeOperationOutput<Id>;

const throwInvalidOperationInput = (
  error: z.ZodError,
  inputJsonSchema: InputJsonSchema
): never =>
  throwBuilderValidationError(
    "Operation input is invalid.",
    getZodValidationIssues(error, inputJsonSchema)
  );

const parseOperationInput = <Schema extends z.ZodTypeAny>(
  schema: Schema,
  input: unknown,
  inputJsonSchema: InputJsonSchema
): z.infer<Schema> => {
  const result = schema.safeParse(input ?? {});
  if (result.success) {
    return result.data;
  }
  const hasUnknownTransportField = result.error.issues.some(
    (issue) =>
      issue.code === "unrecognized_keys" &&
      issue.keys.some((key) => key === "projectId" || key === "confirm")
  );
  if (
    hasUnknownTransportField &&
    typeof input === "object" &&
    input !== null &&
    Array.isArray(input) === false
  ) {
    const {
      projectId: _projectId,
      confirm: _confirm,
      ...operationInput
    } = input as Record<string, unknown>;
    const operationResult = schema.safeParse(operationInput);
    if (operationResult.success) {
      return operationResult.data;
    }
    return throwInvalidOperationInput(operationResult.error, inputJsonSchema);
  }
  return throwInvalidOperationInput(result.error, inputJsonSchema);
};

const bindExpressionInput = (
  state: BuilderState,
  instanceId: string,
  expression: string
) => {
  if (state.instances === undefined || state.dataSources === undefined) {
    return expression;
  }
  return data.bindExpressionToInstanceScope({
    expression,
    instanceId,
    instances: state.instances,
    dataSources: state.dataSources,
  });
};

const getScopedExpressionWarnings = (
  state: BuilderState,
  instanceId: string,
  path: string[],
  expression: string,
  allowAssignment = false,
  additionalVariables: readonly string[] = []
) => {
  if (state.instances === undefined || state.dataSources === undefined) {
    return [];
  }
  const availableVariables = new Set(
    data
      .findAvailableVariables({
        startingInstanceId: instanceId,
        instances: state.instances,
        dataSources: state.dataSources,
      })
      .map(({ name }) => name)
  );
  for (const name of additionalVariables) {
    availableVariables.add(name);
  }
  return getExpressionWarnings({
    expression,
    availableVariables,
    allowAssignment,
    path,
    instanceId,
  });
};

const getScopedPropWarnings = ({
  state,
  instanceId,
  path,
  prop,
  variables = [],
}: {
  state: BuilderState;
  instanceId: string;
  path: string[];
  prop: Parameters<typeof props.listPropExpressions>[0];
  variables?: readonly string[];
}) =>
  props
    .listPropExpressions(prop)
    .flatMap((entry) =>
      getScopedExpressionWarnings(
        state,
        instanceId,
        [...path, ...entry.path],
        entry.expression,
        entry.allowAssignment,
        [...variables, ...entry.variables]
      )
    );

const withExpressionWarnings = <
  Mutation extends { result: Record<string, unknown> },
>(
  mutation: Mutation,
  warnings: ReturnType<typeof getExpressionWarnings>
) =>
  warnings.length === 0
    ? mutation
    : {
        ...mutation,
        result: { ...mutation.result, warnings },
      };

const runtimeOperation = <
  Id extends RuntimeOutputSchemaId,
  Schema extends z.ZodTypeAny,
  Contract extends RuntimeOperationContractInput,
>(
  id: Id,
  publicApi: RuntimeOperationPublicApi,
  contract: Contract,
  inputSchema: Schema,
  execute: (args: {
    state: BuilderState;
    input: z.output<Schema>;
    context: BuilderRuntimeContext;
  }) =>
    | RuntimeExecutionOutput<Id, Contract>
    | Promise<RuntimeExecutionOutput<Id, Contract>>
): BuilderRuntimeOperation<
  Id,
  z.input<Schema>,
  RuntimeExecutionOutput<Id, Contract>
> => {
  const writeNamespaces =
    contract.kind === "mutation" ? contract.writeNamespaces : [];
  const inputJsonSchema = getInputSchemaMetadata(inputSchema, {
    isHiddenField: isHiddenPublicApiInputField,
  }).inputJsonSchema;
  const outputSchema = getRuntimeOutputSchema(id);
  const executionOutputSchema =
    contract.kind === "mutation"
      ? createRuntimeMutationExecutionSchema(outputSchema)
      : outputSchema;
  return {
    id,
    ...publicApi,
    kind: contract.kind,
    inputSchema,
    inputJsonSchema,
    outputSchema,
    outputJsonSchema: getInputSchemaMetadata(outputSchema).inputJsonSchema,
    readNamespaces: contract.readNamespaces,
    writeNamespaces,
    invalidatesNamespaces:
      contract.kind === "mutation"
        ? (contract.invalidatesNamespaces ?? contract.writeNamespaces)
        : [],
    retryOnConflict:
      contract.kind === "mutation"
        ? (contract.retryOnConflict ?? false)
        : false,
    requiresAssets:
      contract.requiresAssets ??
      (contract.readNamespaces.includes("assets") ||
        writeNamespaces.includes("assets")),
    requiresConfirm:
      contract.kind === "mutation"
        ? (contract.requiresConfirm ?? false)
        : false,
    execute: ({ state, input, context }) => {
      const result = execute({
        state,
        input: parseOperationInput(inputSchema, input, inputJsonSchema),
        context,
      });
      if (result instanceof Promise) {
        return result.then(
          (value) =>
            executionOutputSchema.parse(value) as RuntimeExecutionOutput<
              Id,
              Contract
            >
        );
      }
      return executionOutputSchema.parse(result) as RuntimeExecutionOutput<
        Id,
        Contract
      >;
    },
  };
};

const api = (
  command: string,
  client: string,
  permit?: BuilderApiCapability
): RuntimeOperationPublicApi => ({ command, client, permit });

const readContract = (
  readNamespaces: readonly BuilderNamespace[],
  options: { requiresAssets?: boolean } = {}
): ReadContract => ({
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
}): MutationContract => ({ kind: "mutation", ...input });

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
  "projectSettings",
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
const instanceListInput = instanceFilterInput.extend({
  pageId: z.string().optional(),
  pagePath: z.string().optional(),
  rootInstanceId: z.string().optional(),
  maxDepth: z.number().int().nonnegative().optional(),
  topLevelOnly: z.boolean().optional(),
  labelContains: z.string().optional(),
  ...paginatedOutputInputSchema.shape,
});
const instanceInspectInput = z.object({
  instanceId: z.string(),
  include: z
    .array(
      z.enum([
        "props",
        "styles",
        "bindings",
        "children",
        "sources",
        "ancestors",
      ])
    )
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
  ...paginatedOutputInputSchema.shape,
});
const designTokenListInput = z.object({
  filter: z.string().optional(),
  withUsage: z
    .boolean()
    .optional()
    .describe("Include usage counts. Defaults to true."),
  sort: z.enum(["name", "usage"]).optional(),
  ...paginatedOutputInputSchema.shape,
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
  ...paginatedOutputInputSchema.shape,
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
    "pages.updateSettings",
    api("update-page-settings", "updatePageSettings"),
    mutationContract({
      readNamespaces: ["pages"],
      writeNamespaces: ["pages"],
      retryOnConflict: true,
    }),
    pages.pageSettingsUpdateInput,
    ({ state, input }) => pages.updatePageSettings(state, input)
  ),
  runtimeOperation(
    "pages.updateMarketplace",
    api("update-page-marketplace", "updatePageMarketplace"),
    mutationContract({
      readNamespaces: ["pages"],
      writeNamespaces: ["pages"],
      retryOnConflict: true,
    }),
    pages.pageMarketplaceUpdateInput,
    ({ state, input }) => pages.updatePageMarketplace(state, input)
  ),
  runtimeOperation(
    "pages.savePathInHistory",
    api("save-page-path-history", "savePagePathInHistory"),
    mutationContract({
      readNamespaces: ["pages"],
      writeNamespaces: ["pages"],
      retryOnConflict: true,
    }),
    pages.pageSavePathInHistoryInput,
    ({ state, input }) => pages.savePagePathInHistory(state, input)
  ),
  runtimeOperation(
    "pages.setHome",
    api("set-home-page", "setHomePage"),
    mutationContract({
      readNamespaces: ["pages"],
      writeNamespaces: ["pages"],
      retryOnConflict: true,
    }),
    pages.pageSetHomeInput,
    ({ state, input }) => pages.setHomePage(state, input)
  ),
  runtimeOperation(
    "projectSettings.get",
    api("get-project-settings", "getProjectSettings"),
    readContract(["pages", "projectSettings"]),
    emptyInput,
    ({ state }) => projectSettings.getProjectSettings(state)
  ),
  runtimeOperation(
    "projectSettings.update",
    api("update-project-settings", "updateProjectSettings"),
    mutationContract({
      readNamespaces: ["projectSettings"],
      writeNamespaces: ["projectSettings"],
      retryOnConflict: true,
    }),
    projectSettings.projectSettingsUpdateInput,
    ({ state, input }) => projectSettings.updateProjectSettings(state, input)
  ),
  runtimeOperation(
    "projectSettings.getMarketplaceProduct",
    api("get-marketplace-product", "getMarketplaceProduct"),
    readContract(["marketplaceProduct"]),
    emptyInput,
    ({ state }) => projectSettings.getMarketplaceProduct(state)
  ),
  runtimeOperation(
    "projectSettings.updateMarketplaceProduct",
    api("update-marketplace-product", "updateMarketplaceProduct"),
    mutationContract({
      readNamespaces: ["marketplaceProduct"],
      writeNamespaces: ["marketplaceProduct"],
      retryOnConflict: true,
    }),
    projectSettings.marketplaceProductUpdateInput,
    ({ state, input }) => projectSettings.updateMarketplaceProduct(state, input)
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
    "redirects.setAll",
    api("set-redirects", "setRedirects"),
    mutationContract({
      readNamespaces: ["pages"],
      writeNamespaces: ["pages"],
      retryOnConflict: true,
    }),
    projectSettings.redirectSetAllInput,
    ({ state, input }) => projectSettings.setRedirects(state, input)
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
    "pages.copy",
    api("copy-page", "copyPage"),
    mutationContract({
      readNamespaces: pageCopyNamespaces,
      writeNamespaces: pageCopyNamespaces,
    }),
    pageCopy.pageCopyInput,
    ({ state, input, context }) => pageCopy.copyPage(state, input, context)
  ),
  runtimeOperation(
    "pageTemplates.list",
    api("list-page-templates", "listPageTemplates"),
    readContract(["pages"]),
    emptyInput,
    ({ state }) => pageCopy.listPageTemplates(state)
  ),
  runtimeOperation(
    "pageTemplates.create",
    api("create-page-template", "createPageTemplate"),
    mutationContract({
      readNamespaces: pageCopyNamespaces,
      writeNamespaces: pageCopyNamespaces,
    }),
    pageCopy.pageTemplateCreateInput,
    ({ state, input, context }) =>
      pageCopy.createPageTemplate(state, input, context)
  ),
  runtimeOperation(
    "pageTemplates.update",
    api("update-page-template", "updatePageTemplate"),
    mutationContract({
      readNamespaces: pageCopyNamespaces,
      writeNamespaces: pageCopyNamespaces,
      retryOnConflict: true,
    }),
    pageCopy.pageTemplateUpdateInput,
    ({ state, input }) => pageCopy.updatePageTemplate(state, input)
  ),
  runtimeOperation(
    "pageTemplates.delete",
    api("delete-page-template", "deletePageTemplate"),
    mutationContract({
      readNamespaces: pageCopyNamespaces,
      writeNamespaces: pageCopyNamespaces,
    }),
    pageCopy.pageTemplateDeleteInput,
    ({ state, input }) => pageCopy.deletePageTemplate(state, input)
  ),
  runtimeOperation(
    "pageTemplates.duplicate",
    api("duplicate-page-template", "duplicatePageTemplate"),
    mutationContract({
      readNamespaces: pageCopyNamespaces,
      writeNamespaces: pageCopyNamespaces,
    }),
    pageCopy.pageTemplateDuplicateInput,
    ({ state, input, context }) =>
      pageCopy.duplicatePageTemplate(state, input, context)
  ),
  runtimeOperation(
    "pageTemplates.reorder",
    api("reorder-page-template", "reorderPageTemplate"),
    mutationContract({
      readNamespaces: ["pages"],
      writeNamespaces: ["pages"],
      retryOnConflict: true,
    }),
    pageCopy.pageTemplateReorderInput,
    ({ state, input }) => pageCopy.reorderPageTemplates(state, input)
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
    "folders.duplicate",
    api("duplicate-folder", "duplicateFolder"),
    mutationContract({
      readNamespaces: pageCopyNamespaces,
      writeNamespaces: pageCopyNamespaces,
    }),
    pageCopy.folderDuplicateInput,
    ({ state, input, context }) =>
      pageCopy.duplicateFolder(state, input, context)
  ),
  runtimeOperation(
    "pageTransfer.insert",
    api("insert-page-transfer-item", "insertPageTransferItem"),
    mutationContract({
      readNamespaces: pageCopyNamespaces,
      writeNamespaces: pageCopyNamespaces,
    }),
    pageCopy.pageTransferInsertInput,
    ({ state, input, context }) =>
      pageCopy.insertPageTransferItem(state, input, context)
  ),
  runtimeOperation(
    "pageTree.move",
    api("move-page-tree-item", "movePageTreeItem"),
    mutationContract({
      readNamespaces: ["pages"],
      writeNamespaces: ["pages"],
      retryOnConflict: true,
    }),
    pages.pageTreeMoveInput,
    ({ state, input }) => pages.movePageTreeItem(state, input)
  ),
  runtimeOperation(
    "pageTree.reparentOrphans",
    api("reparent-page-tree-orphans", "reparentPageTreeOrphans"),
    mutationContract({
      readNamespaces: ["pages"],
      writeNamespaces: ["pages"],
      retryOnConflict: true,
    }),
    emptyInput,
    ({ state }) => pages.reparentOrphans(state)
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
    "project.search",
    api("search-project", "searchProject"),
    readContract([
      "pages",
      "projectSettings",
      "instances",
      "props",
      "styles",
      "styleSources",
      "styleSourceSelections",
      "resources",
      "dataSources",
      "assets",
      "breakpoints",
    ]),
    search.projectSearchInput,
    ({ state, input }) => search.searchProject(state, input)
  ),
  runtimeOperation(
    "project.audit",
    api("audit", "audit"),
    readContract([
      "pages",
      "projectSettings",
      "instances",
      "props",
      "styles",
      "styleSources",
      "styleSourceSelections",
      "resources",
      "dataSources",
      "assets",
      "breakpoints",
    ]),
    audit.auditInput,
    ({ state, input, context }) => audit.audit(state, input, context)
  ),
  runtimeOperation(
    "instances.insertComponent",
    api("insert-component", "insertComponent"),
    mutationContract({
      readNamespaces: components.componentInsertReadNamespaces,
      writeNamespaces: components.componentInsertNamespaces,
    }),
    components.insertComponentInput,
    ({ state, input, context }) =>
      components.insertComponent(state, input, context)
  ),
  runtimeOperation(
    "instances.insertCollection",
    api("insert-collection", "insertCollection"),
    mutationContract({
      readNamespaces: components.componentInsertReadNamespaces,
      writeNamespaces: components.componentInsertNamespaces,
    }),
    collection.insertCollectionInput,
    ({ state, input, context }) => {
      const warnings = [
        ...(input.data.type === "expression"
          ? getScopedExpressionWarnings(
              state,
              input.parentInstanceId,
              ["data", "value"],
              input.data.value
            )
          : []),
        ...listFragmentExpressions(input.itemFragment).flatMap((entry) =>
          getScopedExpressionWarnings(
            state,
            input.parentInstanceId,
            ["itemFragment", ...entry.path],
            entry.expression,
            entry.allowAssignment,
            ["collectionItem", "collectionItemKey", ...entry.variables]
          )
        ),
      ];
      return withExpressionWarnings(
        components.insertCollection(state, input, context),
        warnings
      );
    }
  ),
  runtimeOperation(
    "instances.insertFragment",
    api("insert-fragment", "insertFragment"),
    mutationContract({
      readNamespaces: components.componentInsertReadNamespaces,
      writeNamespaces: components.componentInsertNamespaces,
    }),
    components.insertFragmentInput,
    ({ state, input, context }) =>
      components.insertFragment(state, input, context)
  ),
  runtimeOperation(
    "instances.move",
    api("move-instance", "moveInstance"),
    mutationContract({
      readNamespaces: ["pages", "instances", "props", ...dataNamespaces],
      writeNamespaces: ["pages", "instances", "props", ...dataNamespaces],
    }),
    instances.moveInstancesInput,
    ({ state, input }) => instances.moveInstances(state, input)
  ),
  runtimeOperation(
    "instances.reparent",
    api("reparent-instance", "reparentInstance"),
    mutationContract({
      readNamespaces: [
        "pages",
        "instances",
        "props",
        ...dataNamespaces,
        ...styleNamespaces,
        "breakpoints",
        "assets",
      ],
      writeNamespaces: [
        "pages",
        "instances",
        "props",
        ...dataNamespaces,
        ...styleNamespaces,
        "breakpoints",
        "assets",
      ],
    }),
    instances.reparentInstanceInput,
    ({ state, input, context }) =>
      instances.reparentInstance(state, input, context)
  ),
  runtimeOperation(
    "instances.fillGrid",
    api("fill-grid", "fillGrid"),
    mutationContract({
      readNamespaces: treeMutationNamespaces,
      writeNamespaces: [
        "instances",
        "styleSourceSelections",
        "styleSources",
        "styles",
      ],
    }),
    instances.fillGridInput,
    ({ state, input, context }) => instances.fillGrid(state, input, context)
  ),
  runtimeOperation(
    "instances.wrap",
    api("wrap-instance", "wrapInstance"),
    mutationContract({
      readNamespaces: ["instances", "props"],
      writeNamespaces: ["instances"],
    }),
    instances.wrapInstanceInput,
    ({ state, input, context }) => instances.wrapInstance(state, input, context)
  ),
  runtimeOperation(
    "instances.convert",
    api("convert-instance", "convertInstance"),
    mutationContract({
      readNamespaces: [
        "pages",
        "instances",
        "props",
        "dataSources",
        "resources",
        "styleSourceSelections",
        "styleSources",
        "styles",
        "breakpoints",
        "assets",
      ],
      writeNamespaces: [
        "instances",
        "props",
        "dataSources",
        "resources",
        "styleSourceSelections",
        "styleSources",
        "styles",
        "breakpoints",
        "assets",
      ],
    }),
    instances.convertInstanceInput,
    ({ state, input, context }) =>
      instances.convertInstance(state, input, context)
  ),
  runtimeOperation(
    "instances.unwrap",
    api("unwrap-instance", "unwrapInstance"),
    mutationContract({
      readNamespaces: ["instances", "props"],
      writeNamespaces: ["instances"],
    }),
    instances.unwrapInstanceInput,
    ({ state, input, context }) =>
      instances.unwrapInstance(state, input, context)
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
    "instances.duplicateAfterItself",
    api("duplicate-instance", "duplicateInstance"),
    mutationContract({
      readNamespaces: instanceDuplicate.instanceDuplicateNamespaces,
      writeNamespaces: instanceDuplicate.instanceDuplicateNamespaces,
    }),
    instanceDuplicate.duplicateInstanceAfterItselfInput,
    ({ state, input, context }) =>
      instanceDuplicate.duplicateInstanceAfterItself(state, input, context)
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
    "instances.deleteBySelector",
    api("delete-instance-by-selector", "deleteInstanceBySelector"),
    mutationContract({
      readNamespaces: [
        "pages",
        "instances",
        "props",
        ...dataNamespaces,
        ...styleNamespaces,
        "breakpoints",
        "assets",
      ],
      writeNamespaces: [
        "pages",
        "instances",
        "props",
        ...dataNamespaces,
        ...styleNamespaces,
        "breakpoints",
        "assets",
      ],
    }),
    instances.deleteInstanceBySelectorInput,
    ({ state, input, context }) =>
      instances.deleteInstanceBySelector(state, input, context)
  ),
  runtimeOperation(
    "instances.updateProps",
    api("update-props", "updateProps", "edit"),
    mutationContract({
      readNamespaces: ["instances", "props", "dataSources"],
      writeNamespaces: ["props"],
    }),
    props.propUpdatesInput,
    ({ state, input, context }) => {
      const warnings = input.updates.flatMap((update, index) =>
        getScopedPropWarnings({
          state,
          instanceId: update.instanceId,
          path: ["updates", String(index), "value"],
          prop: update,
        })
      );
      return withExpressionWarnings(
        props.updateProps(
          state,
          {
            updates: input.updates.map((update) =>
              update.type === "expression"
                ? {
                    ...update,
                    value: bindExpressionInput(
                      state,
                      update.instanceId,
                      update.value
                    ),
                  }
                : update
            ),
          },
          context
        ),
        warnings
      );
    }
  ),
  runtimeOperation(
    "instances.replacePropText",
    api("replace-prop-text", "replacePropText", "edit"),
    mutationContract({
      readNamespaces: ["instances", "props"],
      writeNamespaces: ["props"],
      retryOnConflict: true,
    }),
    props.replacePropTextInput,
    ({ state, input }) => props.replacePropText(state, input)
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
    ({ state, input, context }) => {
      const warnings = input.bindings.flatMap((binding, index) =>
        getScopedPropWarnings({
          state,
          instanceId: binding.instanceId,
          path: ["bindings", String(index), "binding", "value"],
          prop: binding.binding,
        })
      );
      return withExpressionWarnings(
        props.bindProps(
          state,
          {
            bindings: input.bindings.map((binding) =>
              binding.binding.type === "expression"
                ? {
                    ...binding,
                    binding: {
                      ...binding.binding,
                      value: bindExpressionInput(
                        state,
                        binding.instanceId,
                        binding.binding.value
                      ),
                    },
                  }
                : binding
            ),
          },
          context
        ),
        warnings
      );
    }
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
      readNamespaces: ["instances", "dataSources"],
      writeNamespaces: ["instances"],
      retryOnConflict: true,
    }),
    instances.updateTextInstanceInput,
    ({ state, input }) => {
      const warnings =
        input.mode === "expression"
          ? getScopedExpressionWarnings(
              state,
              input.instanceId,
              ["text"],
              input.text
            )
          : [];
      return withExpressionWarnings(
        instances.updateTextInstance(
          state,
          input.mode === "expression"
            ? {
                ...input,
                text: bindExpressionInput(state, input.instanceId, input.text),
              }
            : input
        ),
        warnings
      );
    }
  ),
  runtimeOperation(
    "instances.replaceText",
    api("replace-text", "replaceText", "edit"),
    mutationContract({
      readNamespaces: ["pages", "instances"],
      writeNamespaces: ["instances"],
      retryOnConflict: true,
    }),
    instances.replaceTextInput,
    ({ state, input }) => instances.replaceText(state, input)
  ),
  runtimeOperation(
    "instances.setTextContent",
    api("set-text-content", "setTextContent", "edit"),
    mutationContract({
      readNamespaces: ["instances", "dataSources"],
      writeNamespaces: ["instances"],
      retryOnConflict: true,
    }),
    instances.setTextContentInput,
    ({ state, input }) => {
      const warnings =
        input.operation === "set" && input.mode === "expression"
          ? getScopedExpressionWarnings(
              state,
              input.instanceId,
              ["text"],
              input.text
            )
          : [];
      return withExpressionWarnings(
        instances.setTextContent(
          state,
          input.operation === "set" && input.mode === "expression"
            ? {
                ...input,
                text: bindExpressionInput(state, input.instanceId, input.text),
              }
            : input
        ),
        warnings
      );
    }
  ),
  runtimeOperation(
    "instances.updateTextTree",
    api("update-text-tree", "updateTextTree", "edit"),
    mutationContract({
      readNamespaces: [
        "instances",
        "props",
        "dataSources",
        "styleSources",
        "styleSourceSelections",
        "styles",
      ],
      writeNamespaces: [
        "instances",
        "props",
        "dataSources",
        "resources",
        "styleSourceSelections",
        "styleSources",
        "styles",
      ],
      retryOnConflict: true,
    }),
    instances.updateTextTreeInput,
    ({ state, input, context }) =>
      instances.updateTextTree(state, input, context)
  ),
  runtimeOperation(
    "instances.setTag",
    api("set-instance-tag", "setInstanceTag", "edit"),
    mutationContract({
      readNamespaces: ["instances", "props"],
      writeNamespaces: ["instances", "props"],
      retryOnConflict: true,
    }),
    instances.setInstanceTagInput,
    ({ state, input }) => instances.setInstanceTag(state, input)
  ),
  runtimeOperation(
    "instances.setLabel",
    api("set-instance-label", "setInstanceLabel", "edit"),
    mutationContract({
      readNamespaces: ["instances"],
      writeNamespaces: ["instances"],
      retryOnConflict: true,
    }),
    instances.setInstanceLabelInput,
    ({ state, input }) => instances.setInstanceLabel(state, input)
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
    "styles.updateSelectedDeclarations",
    api("update-selected-styles", "updateSelectedStyleDeclarations"),
    mutationContract({
      readNamespaces: ["instances", ...styleNamespaces, "breakpoints"],
      writeNamespaces: ["styles", "styleSources", "styleSourceSelections"],
    }),
    styles.selectedStyleUpdateDeclarationsInput,
    ({ state, input }) => styles.updateSelectedStyleDeclarations(state, input)
  ),
  runtimeOperation(
    "styles.deleteSelectedDeclarations",
    api("delete-selected-styles", "deleteSelectedStyleDeclarations"),
    mutationContract({
      readNamespaces: ["instances", ...styleNamespaces, "breakpoints"],
      writeNamespaces: ["styles"],
    }),
    styles.selectedStyleDeleteDeclarationsInput,
    ({ state, input }) => styles.deleteSelectedStyleDeclarations(state, input)
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
    "designTokens.createAttached",
    api("create-attached-design-token", "createAttachedDesignTokens"),
    mutationContract({
      readNamespaces: ["instances", ...styleNamespaces, "breakpoints"],
      writeNamespaces: ["styleSources", "styles", "styleSourceSelections"],
    }),
    styles.designTokenCreateAttachedInput,
    ({ state, input, context }) =>
      styles.createAttachedDesignTokens(state, input, context)
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
    "styleSources.rename",
    api("rename-style-source", "renameStyleSource"),
    mutationContract({
      readNamespaces: ["styleSources"],
      writeNamespaces: ["styleSources"],
    }),
    styles.styleSourceRenameInput,
    ({ state, input }) => styles.renameStyleSource(state, input)
  ),
  runtimeOperation(
    "styleSources.delete",
    api("delete-style-source", "deleteStyleSources"),
    mutationContract({
      readNamespaces: styleNamespaces,
      writeNamespaces: ["styles", "styleSources", "styleSourceSelections"],
    }),
    styles.styleSourceDeleteInput,
    ({ state, input }) => styles.deleteStyleSources(state, input)
  ),
  runtimeOperation(
    "styleSources.setLock",
    api("set-style-source-lock", "setStyleSourceLock"),
    mutationContract({
      readNamespaces: ["styleSources"],
      writeNamespaces: ["styleSources"],
    }),
    styles.styleSourceLockInput,
    ({ state, input }) => styles.setStyleSourceLock(state, input)
  ),
  runtimeOperation(
    "styleSources.reorder",
    api("reorder-style-sources", "reorderStyleSources"),
    mutationContract({
      readNamespaces: ["instances", "styleSources", "styleSourceSelections"],
      writeNamespaces: ["styleSourceSelections"],
    }),
    styles.styleSourceReorderInput,
    ({ state, input }) => styles.reorderStyleSources(state, input)
  ),
  runtimeOperation(
    "styleSources.clearStyles",
    api("clear-style-source-styles", "clearStyleSourceStyles"),
    mutationContract({
      readNamespaces: ["styles", "styleSources"],
      writeNamespaces: ["styles"],
    }),
    styles.styleSourceClearStylesInput,
    ({ state, input }) => styles.clearStyleSourceStyles(state, input)
  ),
  runtimeOperation(
    "styleSources.duplicate",
    api("duplicate-style-source", "duplicateStyleSource"),
    mutationContract({
      readNamespaces: ["instances", ...styleNamespaces],
      writeNamespaces: ["styles", "styleSources", "styleSourceSelections"],
    }),
    styles.styleSourceDuplicateInput,
    ({ state, input, context }) =>
      styles.duplicateStyleSource(state, input, context)
  ),
  runtimeOperation(
    "styleSources.convertLocalToToken",
    api(
      "convert-local-style-source-to-token",
      "convertLocalStyleSourceToToken"
    ),
    mutationContract({
      readNamespaces: ["instances", "styleSources", "styleSourceSelections"],
      writeNamespaces: ["styleSources", "styleSourceSelections"],
    }),
    styles.styleSourceConvertLocalToTokenInput,
    ({ state, input, context }) =>
      styles.convertLocalStyleSourceToToken(state, input, context)
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
    "cssVariables.rename",
    api("rename-css-variable", "renameCssVariable"),
    mutationContract({
      readNamespaces: [...styleNamespaces, "props"],
      writeNamespaces: ["styles", "props"],
    }),
    styles.cssVariableRenameInput,
    ({ state, input }) => styles.renameCssVariable(state, input)
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
      readNamespaces: ["pages", "instances", "props", ...dataNamespaces],
      writeNamespaces: ["pages", "instances", "props", ...dataNamespaces],
    }),
    data.dataVariableCreateInput,
    ({ state, input, context }) =>
      data.createDataVariable(state, input, context)
  ),
  runtimeOperation(
    "variables.update",
    api("update-variable", "updateVariable"),
    mutationContract({
      readNamespaces: ["pages", "instances", "props", ...dataNamespaces],
      writeNamespaces: ["pages", "instances", "props", ...dataNamespaces],
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
    "variables.deleteUnused",
    api("delete-unused-variables", "deleteUnusedVariables"),
    mutationContract({
      readNamespaces: ["pages", "instances", "props", ...dataNamespaces],
      writeNamespaces: ["pages", "instances", "props", ...dataNamespaces],
    }),
    data.dataVariableDeleteUnusedInput,
    ({ state, input }) => data.deleteUnusedDataVariables(state, input)
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
    ({ state, input, context }) => data.updateResource(state, input, context)
  ),
  runtimeOperation(
    "resources.replaceText",
    api("replace-resource-text", "replaceResourceText"),
    mutationContract({
      readNamespaces: ["resources"],
      writeNamespaces: ["resources"],
      retryOnConflict: true,
    }),
    data.replaceResourceTextInput,
    ({ state, input }) => data.replaceResourceText(state, input)
  ),
  runtimeOperation(
    "resources.upsert",
    api("upsert-resource", "upsertResource"),
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
    data.resourceUpsertInput,
    ({ state, input, context }) => data.upsertResource(state, input, context)
  ),
  runtimeOperation(
    "resources.upsertProp",
    api("upsert-resource-prop", "upsertResourceProp"),
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
    data.resourcePropUpsertInput,
    ({ state, input, context }) =>
      data.upsertResourceProp(state, input, context)
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
    "fonts.list",
    api("list-fonts", "listFonts"),
    readContract(["assets"]),
    fonts.fontListInput,
    ({ state, input }) => fonts.listFonts(state, input)
  ),
  runtimeOperation(
    "assets.findUsage",
    api("find-asset-usage", "findAssetUsage"),
    readContract(assetUsageNamespaces, { requiresAssets: true }),
    assetUsageInput,
    ({ state, input }) => assets.findAssetUsage(state, input)
  ),
  runtimeOperation(
    "assets.update",
    api("update-asset", "updateAsset"),
    mutationContract({
      readNamespaces: ["assets"],
      writeNamespaces: ["assets"],
      requiresAssets: true,
    }),
    assets.assetUpdateInput,
    ({ state, input }) => assets.updateAsset(state, input)
  ),
  runtimeOperation(
    "assets.setImageDescriptions",
    api("set-image-descriptions", "setImageDescriptions"),
    mutationContract({
      readNamespaces: ["assets"],
      writeNamespaces: ["assets"],
      requiresAssets: true,
    }),
    assets.imageDescriptionsSetInput,
    ({ state, input }) => assets.setImageDescriptions(state, input)
  ),
  runtimeOperation(
    "assets.add",
    api("add-asset", "addAsset"),
    mutationContract({
      readNamespaces: ["assets"],
      writeNamespaces: ["assets"],
      retryOnConflict: true,
    }),
    assets.assetAddInput,
    ({ state, input, context }) => assets.addAsset(state, input, context)
  ),
  runtimeOperation(
    "assets.replace",
    api("replace-asset", "replaceAsset"),
    mutationContract({
      readNamespaces: assetUsageNamespaces,
      writeNamespaces: [
        "pages",
        "projectSettings",
        "props",
        "styles",
        "assets",
      ],
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

const internalBuilderRuntimeOperations = [
  runtimeOperation(
    "system.migrateLoadedData",
    api("migrate-loaded-data", "migrateLoadedData"),
    mutationContract({
      readNamespaces: builderNamespaces,
      writeNamespaces: builderNamespaces,
      retryOnConflict: true,
    }),
    migrations.migrateLoadedDataInput,
    ({ state }) => migrations.migrateLoadedData(state)
  ),
] as const satisfies readonly BuilderRuntimeOperation[];

const allBuilderRuntimeOperations = [
  ...builderRuntimeOperations,
  ...internalBuilderRuntimeOperations,
] as const satisfies readonly BuilderRuntimeOperation[];

export type BuilderRuntimeOperationId =
  (typeof allBuilderRuntimeOperations)[number]["id"];

export type BuilderRuntimeOperationInput<Id extends string> = Id extends unknown
  ? Extract<
      (typeof allBuilderRuntimeOperations)[number],
      { id: Id }
    > extends BuilderRuntimeOperation<Id, infer Input, unknown>
    ? Input
    : never
  : never;

export type BuilderRuntimeOperationResult<Id extends string> =
  Id extends unknown
    ? Extract<
        (typeof allBuilderRuntimeOperations)[number],
        { id: Id }
      > extends BuilderRuntimeOperation<Id, unknown, infer Result>
      ? Result
      : never
    : never;

const builderRuntimeOperationById: ReadonlyMap<
  string,
  BuilderRuntimeOperation
> = new Map(
  allBuilderRuntimeOperations.map((operation) => [operation.id, operation])
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
}): Result | Promise<Result> => {
  return getBuilderRuntimeOperation(id).execute({
    state,
    input,
    context,
  }) as Result;
};
