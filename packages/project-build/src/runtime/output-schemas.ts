import { z } from "zod";
import {
  assetType,
  compilerSettings,
  dataSourceVariableValue,
  documentTypes,
  pageAuth,
  pageRedirect,
  pageTemplate as sdkPageTemplate,
  projectMeta,
  prop,
  instance,
} from "@webstudio-is/sdk";
import { paginatedOutputMetadataSchema } from "./output";
import { builderNamespaces } from "../contracts/namespaces";
import { builderPatchSchema } from "../contracts/patch";
import { marketplaceProduct } from "../shared/marketplace";
import { auditResult } from "./audit";
import { bindingVerificationResult } from "./binding-verification";
import { insertCollectionResult } from "./collection";
import {
  componentInsertResult,
  fragmentInsertResult,
} from "./component-insert-contract";
import { expressionWarningSchema } from "./expression-validation";
import { designTokenImportPlanEntrySchema } from "./design-token-import";

const looseObject = <Shape extends z.ZodRawShape>(shape: Shape) =>
  z.looseObject(shape);
const id = z.string();
const stringArray = z.array(z.string());
const styleValue = looseObject({
  type: z.string().describe("CSS value kind"),
  hidden: z.boolean().optional(),
});

const patchChange = z.object({
  namespace: z.enum(builderNamespaces),
  patches: z.array(builderPatchSchema),
});

export const pageDraftOutputHint =
  "True when the page is a draft. Missing or false means the page is publishable.";

export const createRuntimeMutationExecutionSchema = <
  Result extends z.ZodTypeAny,
>(
  result: Result
) =>
  z.object({
    kind: z.literal("mutation"),
    payload: z.array(patchChange),
    result,
    invalidatesNamespaces: z.array(z.enum(builderNamespaces)),
    noop: z.boolean(),
  });

const pageSummary = looseObject({
  id,
  name: z.string(),
  path: z.string(),
  localPath: z.string(),
  title: z.string(),
  rootInstanceId: id,
  parentFolderId: id.optional(),
  isHome: z.boolean(),
  isDraft: z.boolean().optional().describe(pageDraftOutputHint),
});
const pageDetails = pageSummary.extend({
  meta: looseObject({
    description: z.string().optional(),
    language: z.string().optional(),
    redirect: z.string().optional(),
    status: z.string().optional(),
    socialImageUrl: z.string().optional(),
    socialImageAssetId: id.optional(),
    excludePageFromSearch: z.boolean().optional(),
    documentType: z.enum(documentTypes),
    content: z.string().optional(),
    auth: pageAuth.optional(),
    custom: z
      .array(
        looseObject({
          property: z.string(),
          content: z.string(),
        })
      )
      .optional(),
  }),
});
const pagePathLookup = {
  requestedPath: z.string(),
  found: z.boolean(),
  exactMatch: z.boolean(),
  matchedPattern: z.boolean(),
  matchedFallback: z.boolean(),
};
const folder = looseObject({
  id,
  name: z.string(),
  slug: z.string(),
  parentFolderId: id.optional(),
  children: stringArray,
});
const pageTemplate = looseObject({
  id,
  name: z.string(),
  title: z.string(),
  rootInstanceId: id,
  systemDataSourceId: id.optional(),
  meta: looseObject(sdkPageTemplate.shape.meta.shape),
});
const instanceSummary = looseObject({
  id,
  component: z.string(),
  tag: z.string().optional(),
  label: z.string().optional(),
  childCount: z.number().int(),
  depth: z.number().int(),
  parentId: id.optional(),
  indexWithinParent: z.number().int().optional(),
});
const outputPage = paginatedOutputMetadataSchema.shape;
const breakpoint = looseObject({
  id,
  label: z.string(),
  minWidth: z.number().optional(),
  maxWidth: z.number().optional(),
  condition: z.string().optional(),
});
const redirect = looseObject(pageRedirect.shape);
const pageMarketplace = looseObject({
  include: z.boolean().optional(),
  category: z.string().optional(),
  thumbnailAssetId: id.optional(),
});
const textMatch = looseObject({
  instanceId: id,
  childIndex: z.number().int(),
  component: z.string(),
  label: z.string().optional(),
  mode: z.enum(["text", "expression"]),
  valuePreview: z.string(),
  value: z.string().optional(),
  valueLength: z.number().int().nonnegative(),
  truncated: z.boolean(),
});
const declaration = looseObject({
  instanceId: id,
  styleSourceId: id,
  property: z.string(),
  value: styleValue,
  breakpoint: id,
  state: z.string().optional(),
  source: z.enum(["local", "token"]),
});
const declarationSummary = declaration.omit({ value: true }).extend({
  valueType: z.string(),
  value: styleValue.optional(),
});
const token = looseObject({
  id,
  name: z.string(),
  declarationCount: z.number().int(),
  styles: z.record(z.string(), styleValue).optional(),
  usageCount: z.number().int().optional(),
});
const cssVariable = looseObject({
  name: z.string(),
  value: z.string().optional(),
  valueLength: z.number().int().nonnegative(),
  scope: z.string(),
  usageCount: z.number().int().optional(),
});
const variable = looseObject({
  id,
  name: z.string(),
  scopeInstanceId: id.optional(),
  valueType: z.string(),
  value: dataSourceVariableValue.optional(),
});
const resource = looseObject({
  id,
  name: z.string(),
  method: z.enum(["get", "post", "put", "delete"]),
  url: z.string(),
  scopeInstanceId: id.optional(),
  exposedAsDataSource: z.boolean(),
  dataSourceId: id.optional(),
});
const asset = looseObject({
  id,
  name: z.string(),
  filename: z.string().optional(),
  folderId: id.optional(),
  type: assetType,
  size: z.number(),
  contentType: z.string(),
  usageCount: z.number().int().optional(),
});
const assetRecord = looseObject({
  id,
  projectId: id,
  name: z.string(),
  filename: z.string().optional(),
  description: z.string().nullable().optional(),
  folderId: id.optional(),
  type: assetType,
  size: z.number(),
  format: z.string(),
  createdAt: z.string(),
  meta: looseObject({}),
});
const assetListItem = asset.extend({ record: assetRecord.optional() });
const assetFolder = looseObject({
  id,
  projectId: id,
  name: z.string(),
  parentId: id.optional(),
  createdAt: z.string(),
});
const assetUsage = looseObject({
  namespace: z.enum([
    "props",
    "styles",
    "resources",
    "dataSources",
    "pages",
    "project",
  ]),
  pageId: id.optional(),
  instanceId: id.optional(),
  path: z.array(z.string().or(z.number())),
});
const uploadedFontAsset = looseObject({
  assetId: id,
  format: z.string(),
  style: z.string().optional(),
  weight: z.string().or(z.number()).optional(),
  variable: z.boolean(),
});
const uploadedFont = looseObject({
  family: z.string(),
  source: z.literal("uploaded"),
  assetCount: z.number().int().nonnegative(),
  assets: z.array(uploadedFontAsset).optional(),
});
const systemFont = looseObject({
  family: z.string(),
  source: z.literal("system"),
  stack: stringArray.optional(),
  description: z.string().optional(),
});

const instanceIdsResult = looseObject({ instanceIds: stringArray });
const pageIdResult = looseObject({ pageId: id });
const folderIdResult = looseObject({ folderId: id });
const templateIdResult = looseObject({ templateId: id });
const breakpointIdResult = looseObject({ breakpointId: id });
const dataSourceIdResult = looseObject({ dataSourceId: id });
const assetIdResult = looseObject({ assetId: id });
const styleKeysResult = looseObject({ styleKeys: stringArray });
const textReplacementMatch = looseObject({
  instanceId: id,
  childIndex: z.number().int(),
  before: z.string(),
  after: z.string(),
});
const propReplacementMatch = looseObject({
  propId: id,
  instanceId: id,
  name: z.string(),
  before: z.string(),
  after: z.string(),
});
const resourceReplacementMatch = looseObject({
  resourceId: id,
  field: z.enum(["name", "url"]),
  before: z.string(),
  after: z.string(),
});
const expressionWarnings = z.array(expressionWarningSchema);
const resourceMutationResult = looseObject({
  resourceId: id,
  dataSourceId: id.optional(),
  warnings: expressionWarnings,
});
const retainedRuntimeBehavior = looseObject({
  instanceId: id,
  responsibility: z.string(),
});
const unsupportedRuntimeConversion = looseObject({
  behavior: z.string(),
  reason: z.string(),
});

export const runtimeOutputSchemas = {
  "assetFolders.list": looseObject({ folders: z.array(assetFolder) }),
  "assetFolders.create": folderIdResult,
  "assetFolders.update": folderIdResult,
  "assetFolders.delete": folderIdResult,
  "assetFolders.duplicate": folderIdResult,
  "assets.get": looseObject({ asset: assetRecord }),
  "pages.list": looseObject({
    pages: z.array(pageSummary),
    ...outputPage,
  }),
  "pages.get": pageDetails,
  "pages.getByPath": z.union([
    pageDetails.extend(pagePathLookup),
    looseObject({
      ...pagePathLookup,
      fallbackPage: pageDetails,
      guidance: z.string(),
    }),
  ]),
  "pages.create": looseObject({ pageId: id, rootInstanceId: id }),
  "pages.update": pageIdResult,
  "pages.updateSettings": pageIdResult,
  "pages.updateMarketplace": looseObject({
    pageId: id,
    marketplace: pageMarketplace,
  }),
  "pages.savePathInHistory": looseObject({}),
  "pages.setHome": pageIdResult,
  "projectSettings.get": looseObject({
    meta: looseObject(projectMeta.shape),
    compiler: looseObject(compilerSettings.shape),
    redirects: z.array(redirect).optional(),
  }),
  "projectSettings.update": looseObject({ updated: z.boolean() }),
  "projectSettings.getMarketplaceProduct": looseObject({
    marketplaceProduct: looseObject(marketplaceProduct.shape),
  }),
  "projectSettings.updateMarketplaceProduct": looseObject({
    updated: z.boolean(),
  }),
  "redirects.list": looseObject({
    redirects: z.array(redirect),
    ...outputPage,
  }),
  "redirects.create": looseObject({ old: z.string() }),
  "redirects.update": looseObject({ old: z.string() }),
  "redirects.delete": looseObject({ old: z.string() }),
  "redirects.setAll": looseObject({ count: z.number().int() }),
  "breakpoints.list": looseObject({
    breakpoints: z.array(breakpoint),
    ...outputPage,
  }),
  "breakpoints.create": breakpointIdResult,
  "breakpoints.update": breakpointIdResult,
  "breakpoints.delete": breakpointIdResult,
  "pages.delete": pageIdResult,
  "pages.duplicate": pageIdResult,
  "pages.copy": pageIdResult,
  "pageTemplates.list": looseObject({
    templates: z.array(pageTemplate),
    ...outputPage,
  }),
  "pageTemplates.create": looseObject({ templateId: id, rootInstanceId: id }),
  "pageTemplates.update": templateIdResult,
  "pageTemplates.delete": templateIdResult,
  "pageTemplates.duplicate": templateIdResult,
  "pageTemplates.reorder": templateIdResult,
  "pageTemplates.createPage": pageIdResult,
  "folders.list": looseObject({
    folders: z.array(folder),
    ...outputPage,
  }),
  "folders.create": folderIdResult,
  "folders.update": folderIdResult,
  "folders.delete": looseObject({
    folderId: id,
    pageIds: stringArray,
    folderIds: stringArray,
  }),
  "folders.duplicate": folderIdResult,
  "pageTransfer.insert": looseObject({
    id,
    type: z.enum(["page", "folder", "template"]),
    didReachBreakpointLimit: z.boolean(),
  }),
  "pageTree.move": looseObject({ childId: id }),
  "pageTree.reparentOrphans": looseObject({}),
  "instances.list": looseObject({
    instances: z.array(instanceSummary.extend({ record: instance.optional() })),
    ...outputPage,
  }),
  "instances.inspect": instanceSummary.extend({
    ancestors: z.array(instanceSummary).optional(),
    props: z.array(prop).optional(),
    styles: z.array(declaration).optional(),
    children: z.array(instanceSummary).optional(),
    bindings: z.array(prop).optional(),
    sources: stringArray.optional(),
  }),
  "project.search": looseObject({
    query: z.string(),
    scopes: stringArray,
    truncated: z.boolean(),
    matches: z.array(looseObject({ kind: z.string() })),
    ...outputPage,
  }),
  "project.audit": auditResult,
  "project.verifyBindings": bindingVerificationResult,
  "runtimeUi.integrate": looseObject({
    created: looseObject({
      variableIds: stringArray,
      resources: z.array(
        looseObject({ resourceId: id, dataSourceId: id.optional() })
      ),
      instanceIds: stringArray,
      rootInstanceIds: stringArray,
      propIds: stringArray,
    }),
    editableStructure: looseObject({
      type: z.enum(["fragment", "collection"]),
      usesCollection: z.boolean(),
    }),
    retainedBehavior: z.array(retainedRuntimeBehavior),
    unsupportedConversions: z.array(unsupportedRuntimeConversion),
    warnings: expressionWarnings,
  }),
  "instances.insertComponent": componentInsertResult,
  "instances.insertCollection": insertCollectionResult.extend({
    warnings: expressionWarnings.optional(),
  }),
  "instances.insertFragment": fragmentInsertResult,
  "slots.attach": looseObject({ slotId: id, fragmentId: id }),
  "slots.extract": looseObject({ slotId: id, fragmentId: id, instanceId: id }),
  "instances.move": instanceIdsResult,
  "instances.reparent": looseObject({
    instanceSelector: stringArray.optional(),
  }),
  "instances.fillGrid": looseObject({
    instanceIds: stringArray,
    styleSourceIds: stringArray,
  }),
  "instances.wrap": looseObject({ instanceSelector: stringArray }),
  "instances.convert": looseObject({ instanceId: id.optional() }),
  "instances.unwrap": looseObject({ instanceSelector: stringArray }),
  "instances.clone": looseObject({ instanceId: id, instanceIds: stringArray }),
  "instances.duplicateAfterItself": looseObject({
    instanceId: id,
    parentInstanceId: id.optional(),
  }),
  "instances.delete": instanceIdsResult,
  "instances.deleteBySelector": looseObject({
    instanceIds: stringArray,
    instanceSelector: stringArray.optional(),
  }),
  "instances.updateProps": looseObject({
    propIds: stringArray,
    warnings: expressionWarnings.optional(),
  }),
  "instances.replacePropText": looseObject({
    changedCount: z.number().int(),
    matchingPropCount: z.number().int(),
    truncated: z.boolean(),
    matches: z.array(propReplacementMatch),
  }),
  "instances.deleteProps": looseObject({ propIds: stringArray }),
  "instances.bindProps": looseObject({
    propIds: stringArray,
    warnings: expressionWarnings.optional(),
  }),
  "instances.listTexts": looseObject({
    texts: z.array(textMatch),
    ...outputPage,
  }),
  "instances.updateText": looseObject({
    instanceId: id,
    childIndex: z.number().int(),
    mode: z.enum(["text", "expression"]),
    warnings: expressionWarnings.optional(),
  }),
  "instances.replaceText": looseObject({
    changedCount: z.number().int(),
    matchingChildCount: z.number().int(),
    truncated: z.boolean(),
    matches: z.array(textReplacementMatch),
  }),
  "instances.setTextContent": looseObject({
    instanceId: id,
    operation: z.enum(["set", "reset"]),
    mode: z.enum(["text", "expression"]).optional(),
    warnings: expressionWarnings.optional(),
  }),
  "instances.updateTextTree": looseObject({
    rootInstanceId: id,
    instanceIds: stringArray,
    idMap: z.record(z.string(), z.string()),
  }),
  "instances.setTag": looseObject({ instanceId: id, tag: z.string() }),
  "instances.setLabel": looseObject({
    instanceIds: stringArray,
    label: z.string(),
  }),
  "styles.getDeclarations": looseObject({
    declarations: z.array(declarationSummary),
    ...outputPage,
  }),
  "styles.updateDeclarations": styleKeysResult,
  "styles.deleteDeclarations": styleKeysResult,
  "styles.updateSelectedDeclarations": styleKeysResult,
  "styles.deleteSelectedDeclarations": styleKeysResult,
  "styles.replaceValues": styleKeysResult,
  "designTokens.list": looseObject({ tokens: z.array(token), ...outputPage }),
  "designTokens.create": looseObject({ tokenIds: stringArray }),
  "designTokens.import": looseObject({
    plan: z.array(designTokenImportPlanEntrySchema),
    counts: looseObject({
      create: z.number().int(),
      overwrite: z.number().int(),
      skip: z.number().int(),
    }),
  }),
  "designTokens.createAttached": looseObject({ tokenIds: stringArray }),
  "designTokens.updateStyles": looseObject({
    designTokenId: id,
    styleKeys: stringArray,
  }),
  "designTokens.deleteStyles": looseObject({
    designTokenId: id,
    styleKeys: stringArray,
  }),
  "designTokens.attach": looseObject({ designTokenId: id }),
  "designTokens.detach": looseObject({ designTokenId: id }),
  "designTokens.extract": looseObject({
    designTokenId: id,
    styleKeys: stringArray,
  }),
  "styleSources.rename": looseObject({ styleSourceId: id }),
  "styleSources.delete": looseObject({ styleSourceIds: stringArray }),
  "styleSources.setLock": looseObject({
    styleSourceId: id,
    locked: z.boolean(),
  }),
  "styleSources.reorder": looseObject({
    instanceId: id,
    styleSourceIds: stringArray,
  }),
  "styleSources.clearStyles": looseObject({
    styleSourceId: id,
    styleKeys: stringArray,
  }),
  "styleSources.duplicate": looseObject({ styleSourceId: id }),
  "styleSources.convertLocalToToken": looseObject({ styleSourceId: id }),
  "cssVariables.list": looseObject({
    vars: z.array(cssVariable),
    ...outputPage,
  }),
  "cssVariables.define": looseObject({ names: stringArray }),
  "cssVariables.delete": looseObject({
    names: stringArray,
    styleKeys: stringArray,
  }),
  "cssVariables.rewriteRefs": looseObject({
    styleKeys: stringArray,
    propIds: stringArray,
  }),
  "cssVariables.rename": looseObject({
    oldName: z.string(),
    newName: z.string(),
    styleKeys: stringArray,
    propIds: stringArray,
  }),
  "variables.list": looseObject({
    variables: z.array(variable),
    ...outputPage,
  }),
  "variables.create": dataSourceIdResult,
  "variables.update": dataSourceIdResult,
  "variables.delete": dataSourceIdResult,
  "variables.deleteUnused": looseObject({
    dataSourceIds: stringArray,
    deletedCount: z.number().int(),
  }),
  "resources.list": looseObject({
    resources: z.array(resource),
    ...outputPage,
  }),
  "resources.create": resourceMutationResult,
  "resources.update": resourceMutationResult.partial({ warnings: true }),
  "resources.replaceText": looseObject({
    changedCount: z.number().int(),
    matchingFieldCount: z.number().int(),
    truncated: z.boolean(),
    matches: z.array(resourceReplacementMatch),
  }),
  "resources.upsert": looseObject({ resourceId: id, dataSourceId: id }),
  "resources.upsertProp": looseObject({
    resourceId: id,
    dataSourceId: id,
    propIds: stringArray,
  }),
  "resources.delete": looseObject({
    resourceId: id,
    dataSourceIds: stringArray,
    propIds: stringArray,
  }),
  "assets.list": looseObject({
    items: z.array(assetListItem),
    ...outputPage,
  }),
  "fonts.list": looseObject({
    uploaded: z.array(uploadedFont),
    system: z.array(systemFont),
    ...outputPage,
  }),
  "assets.findUsage": looseObject({
    usages: z.array(assetUsage),
    ...outputPage,
  }),
  "assets.update": assetIdResult,
  "assets.setImageDescriptions": looseObject({
    updated: z.array(looseObject({ assetId: id, decorative: z.boolean() })),
  }),
  "assets.add": assetIdResult,
  "assets.duplicate": assetIdResult,
  "assets.replace": looseObject({ fromAssetId: id, toAssetId: id }),
  "assets.delete": looseObject({ assetIds: stringArray }),
  "system.migrateLoadedData": looseObject({ didBreakCycles: z.boolean() }),
} satisfies Record<string, z.ZodTypeAny>;

export type RuntimeOutputSchemaId = keyof typeof runtimeOutputSchemas;
export type RuntimeOperationOutput<Id extends RuntimeOutputSchemaId> = z.output<
  (typeof runtimeOutputSchemas)[Id]
>;

export function getRuntimeOutputSchema<Id extends RuntimeOutputSchemaId>(
  operationId: Id
): (typeof runtimeOutputSchemas)[Id];
export function getRuntimeOutputSchema(operationId: string): z.ZodTypeAny;
export function getRuntimeOutputSchema(operationId: string) {
  const schema = runtimeOutputSchemas[operationId as RuntimeOutputSchemaId];
  if (schema === undefined) {
    throw new Error(
      `Missing runtime output schema for operation "${operationId}".`
    );
  }
  return schema;
}
