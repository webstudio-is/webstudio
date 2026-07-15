import { z } from "zod";
import {
  assetType,
  compilerSettings,
  documentTypes,
  pageAuth,
  pageRedirect,
  pageTemplate as sdkPageTemplate,
  projectMeta,
  prop,
} from "@webstudio-is/sdk";
import { builderNamespaces } from "../contracts/namespaces";
import { builderPatchSchema } from "../contracts/patch";
import { marketplaceProduct } from "../shared/marketplace";
import { auditResult } from "./audit";
import { insertCollectionResult } from "./collection";

const looseObject = <Shape extends z.ZodRawShape>(shape: Shape) =>
  z.looseObject(shape);
const id = z.string();
const stringArray = z.array(z.string());
const unknownRecord = z.record(z.string(), z.unknown());

const patchChange = z.object({
  namespace: z.enum(builderNamespaces),
  patches: z.array(builderPatchSchema),
});

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
  value: z.string(),
});
const declaration = looseObject({
  instanceId: id,
  styleSourceId: id,
  property: z.string(),
  value: z.unknown(),
  breakpoint: id,
  state: z.string().optional(),
  source: z.enum(["local", "token"]),
});
const token = looseObject({
  id,
  name: z.string(),
  declarationCount: z.number().int(),
  styles: unknownRecord.optional(),
  usageCount: z.number().int().optional(),
});
const cssVariable = looseObject({
  name: z.string(),
  value: z.string(),
  scope: z.string(),
  usageCount: z.number().int().optional(),
});
const variable = looseObject({
  id,
  name: z.string(),
  scopeInstanceId: id.optional(),
  value: z.unknown(),
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
  description: z.string().nullable().optional(),
  type: assetType,
  size: z.number(),
  contentType: z.string(),
  createdAt: z.string(),
  usageCount: z.number().int().optional(),
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
  assets: z.array(uploadedFontAsset),
});
const systemFont = looseObject({
  family: z.string(),
  source: z.literal("system"),
  stack: stringArray,
  description: z.string(),
});

const insertedInstances = looseObject({
  instanceIds: stringArray,
  rootInstanceIds: stringArray,
  removedInstanceIds: stringArray,
  parentInstanceId: id.optional(),
  didMergeBreakpointsDueToLimit: z.boolean().optional(),
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
const resourceMutationResult = looseObject({
  resourceId: id,
  dataSourceId: id.optional(),
  warnings: stringArray,
});

export const runtimeOutputSchemas = {
  "pages.list": looseObject({
    pages: z.array(pageSummary),
    folders: z.array(folder).optional(),
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
    redirects: z.array(redirect),
  }),
  "projectSettings.update": looseObject({ updated: z.boolean() }),
  "projectSettings.getMarketplaceProduct": looseObject({
    marketplaceProduct: looseObject(marketplaceProduct.shape),
  }),
  "projectSettings.updateMarketplaceProduct": looseObject({
    updated: z.boolean(),
  }),
  "redirects.list": looseObject({ redirects: z.array(redirect) }),
  "redirects.create": looseObject({ old: z.string() }),
  "redirects.update": looseObject({ old: z.string() }),
  "redirects.delete": looseObject({ old: z.string() }),
  "redirects.setAll": looseObject({ count: z.number().int() }),
  "breakpoints.list": looseObject({ breakpoints: z.array(breakpoint) }),
  "breakpoints.create": breakpointIdResult,
  "breakpoints.update": breakpointIdResult,
  "breakpoints.delete": breakpointIdResult,
  "pages.delete": pageIdResult,
  "pages.duplicate": pageIdResult,
  "pages.copy": pageIdResult,
  "pageTemplates.list": looseObject({ templates: z.array(pageTemplate) }),
  "pageTemplates.create": looseObject({ templateId: id, rootInstanceId: id }),
  "pageTemplates.update": templateIdResult,
  "pageTemplates.delete": templateIdResult,
  "pageTemplates.duplicate": templateIdResult,
  "pageTemplates.reorder": templateIdResult,
  "pageTemplates.createPage": pageIdResult,
  "folders.list": looseObject({
    folders: z.array(folder),
    pages: z.array(pageSummary).optional(),
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
  "instances.list": looseObject({ instances: z.array(instanceSummary) }),
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
    total: z.number().int(),
    truncated: z.boolean(),
    matches: z.array(looseObject({ kind: z.string() })),
  }),
  "project.audit": auditResult,
  "instances.insertComponent": insertedInstances,
  "instances.insertCollection": insertCollectionResult,
  "instances.insertFragment": insertedInstances,
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
  "instances.updateProps": looseObject({ propIds: stringArray }),
  "instances.replacePropText": looseObject({
    changedCount: z.number().int(),
    matchingPropCount: z.number().int(),
    truncated: z.boolean(),
    matches: z.array(propReplacementMatch),
  }),
  "instances.deleteProps": looseObject({ propIds: stringArray }),
  "instances.bindProps": looseObject({ propIds: stringArray }),
  "instances.listTexts": looseObject({ texts: z.array(textMatch) }),
  "instances.updateText": looseObject({
    instanceId: id,
    childIndex: z.number().int(),
    mode: z.enum(["text", "expression"]),
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
    declarations: z.array(declaration),
  }),
  "styles.updateDeclarations": styleKeysResult,
  "styles.deleteDeclarations": styleKeysResult,
  "styles.updateSelectedDeclarations": styleKeysResult,
  "styles.deleteSelectedDeclarations": styleKeysResult,
  "styles.replaceValues": styleKeysResult,
  "designTokens.list": looseObject({ tokens: z.array(token) }),
  "designTokens.create": looseObject({ tokenIds: stringArray }),
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
  "cssVariables.list": looseObject({ vars: z.array(cssVariable) }),
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
  "variables.list": looseObject({ variables: z.array(variable) }),
  "variables.create": dataSourceIdResult,
  "variables.update": dataSourceIdResult,
  "variables.delete": dataSourceIdResult,
  "variables.deleteUnused": looseObject({
    dataSourceIds: stringArray,
    deletedCount: z.number().int(),
  }),
  "resources.list": looseObject({ resources: z.array(resource) }),
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
    items: z.array(asset),
    nextCursor: z.string().nullable(),
  }),
  "fonts.list": looseObject({
    uploaded: z.array(uploadedFont),
    system: z.array(systemFont),
  }),
  "assets.findUsage": looseObject({ usages: z.array(assetUsage) }),
  "assets.update": assetIdResult,
  "assets.setImageDescriptions": looseObject({
    updated: z.array(looseObject({ assetId: id, decorative: z.boolean() })),
  }),
  "assets.add": assetIdResult,
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
