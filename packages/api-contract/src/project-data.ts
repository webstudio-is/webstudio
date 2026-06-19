import {
  Asset,
  Breakpoint,
  DataSource,
  Deployment,
  Instance,
  Prop,
  Resource,
  StyleDecl,
  StyleSource,
  StyleSourceSelection,
  type Page,
} from "@webstudio-is/sdk";
import type { Build } from "@webstudio-is/project-build";
import type { SerializedPages } from "@webstudio-is/project-migrations/pages";
import { z } from "zod";

const entrySchema = <Value extends z.ZodTypeAny>(value: Value) =>
  z.tuple([z.string(), value]);

type SchemaShape<Value extends object> = {
  [Key in keyof Required<Value>]: z.ZodType<Value[Key]>;
};

export const assetFileDataPattern = /^[A-Za-z0-9+/]*={0,2}$/;

export const isAssetFileDataString = (value: string) => {
  if (value.length % 4 !== 0) {
    return false;
  }
  if (assetFileDataPattern.test(value) === false) {
    return false;
  }
  const paddingIndex = value.indexOf("=");
  return paddingIndex === -1 || paddingIndex >= value.length - 2;
};

export const assetFileDataSchema = z.object({
  name: z.string(),
  data: z.string().refine(isAssetFileDataString),
});
export type AssetFileData = z.infer<typeof assetFileDataSchema>;

export type SyncedProjectBuild = Omit<Build, "pages" | "marketplaceProduct"> & {
  pages: SerializedPages;
};

const syncedProjectBuildShape: SchemaShape<SyncedProjectBuild> = {
  id: z.string(),
  projectId: z.string(),
  version: z.number(),
  createdAt: z.string(),
  updatedAt: z.string(),
  pages: z.custom<SerializedPages>(),
  breakpoints: z.array(entrySchema(Breakpoint)),
  styles: z.array(entrySchema(StyleDecl)),
  styleSources: z.array(entrySchema(StyleSource)),
  styleSourceSelections: z.array(entrySchema(StyleSourceSelection)),
  props: z.array(entrySchema(Prop)),
  instances: z.array(entrySchema(Instance)),
  dataSources: z.array(entrySchema(DataSource)),
  resources: z.array(entrySchema(Resource)),
  deployment: Deployment.optional(),
};

const syncedProjectBuildSchema: z.ZodObject<typeof syncedProjectBuildShape> =
  z.object(syncedProjectBuildShape);

export type SyncedProjectData = {
  syncDataVersion?: string | number;
  page: Page;
  pages: Page[];
  build: SyncedProjectBuild;
  assets: Asset[];
  projectDomain?: string;
  origin?: string;
};

const syncedProjectDataShape: SchemaShape<SyncedProjectData> = {
  syncDataVersion: z.union([z.string(), z.number()]).optional(),
  page: z.custom<Page>(),
  pages: z.array(z.custom<Page>()),
  build: syncedProjectBuildSchema,
  assets: z.array(Asset),
  projectDomain: z.string().optional(),
  origin: z.string().optional(),
};

export const syncedProjectDataSchema: z.ZodObject<
  typeof syncedProjectDataShape
> = z.object(syncedProjectDataShape);

export type ImportProjectDataInput = {
  projectId: string;
  data: SyncedProjectData;
  assetFiles?: AssetFileData[];
  ignoreVersionCheck?: boolean;
};

const importProjectDataInputShape: SchemaShape<ImportProjectDataInput> = {
  projectId: z.string(),
  data: syncedProjectDataSchema,
  assetFiles: z.array(assetFileDataSchema).optional(),
  ignoreVersionCheck: z.boolean().optional(),
};

const importProjectDataInputSchemaValue = z.object(importProjectDataInputShape);
export const importProjectDataInputSchema: z.ZodType<ImportProjectDataInput> =
  importProjectDataInputSchemaValue;

export const importProjectDataResultSchema = z.object({
  version: z.number(),
});
export type ImportProjectDataResult = z.infer<
  typeof importProjectDataResultSchema
>;

const getSchemaContract = (schema: z.ZodTypeAny): unknown => {
  const definition = schema._def;
  switch (definition.typeName) {
    case z.ZodFirstPartyTypeKind.ZodArray:
      return {
        type: "array",
        value: getSchemaContract(definition.type),
      };
    case z.ZodFirstPartyTypeKind.ZodEffects:
      return {
        type: "effects",
        value: getSchemaContract(definition.schema),
      };
    case z.ZodFirstPartyTypeKind.ZodObject:
      return {
        type: "object",
        shape: Object.fromEntries(
          Object.entries(definition.shape())
            .sort(([left], [right]) => left.localeCompare(right))
            .map(([key, value]) => [
              key,
              getSchemaContract(value as z.ZodTypeAny),
            ])
        ),
      };
    case z.ZodFirstPartyTypeKind.ZodOptional:
      return {
        type: "optional",
        value: getSchemaContract(definition.innerType),
      };
    case z.ZodFirstPartyTypeKind.ZodTuple:
      return {
        type: "tuple",
        items: definition.items.map(getSchemaContract),
      };
    case z.ZodFirstPartyTypeKind.ZodUnion:
      return {
        type: "union",
        options: definition.options.map(getSchemaContract),
      };
    default:
      return { type: definition.typeName };
  }
};

const stableStringify = (value: unknown): string => {
  if (Array.isArray(value)) {
    return `[${value.map(stableStringify).join(",")}]`;
  }
  if (value !== null && typeof value === "object") {
    return `{${Object.entries(value)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, item]) => `${JSON.stringify(key)}:${stableStringify(item)}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
};

const createContractVersion = (schema: z.ZodTypeAny) => {
  let hash = 0x811c9dc5;
  for (const char of stableStringify(getSchemaContract(schema))) {
    hash ^= char.charCodeAt(0);
    hash = Math.imul(hash, 0x01000193);
  }
  return `sync-data-${(hash >>> 0).toString(16).padStart(8, "0")}` as const;
};

export const syncDataVersion = createContractVersion(syncedProjectDataSchema);

export const getSyncDataVersion = (data: unknown) => {
  if (typeof data !== "object" || data === null) {
    return;
  }
  const version = (data as { syncDataVersion?: unknown }).syncDataVersion;
  return typeof version === "number" || typeof version === "string"
    ? version
    : undefined;
};
