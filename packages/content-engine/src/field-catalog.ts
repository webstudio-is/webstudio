import {
  assetQueryStandardFields,
  builderAssetFieldCatalog,
  isAssetQueryRuntimeField,
  type AssetFileDocument,
  type BuilderAssetFieldCatalog,
} from "./schema";
import {
  compareStrings,
  serializeJsonDeterministically,
  sha256,
} from "./canonical-json";
import {
  createCanonicalAssetFileEntry,
  getFieldContributions,
  getObservedFieldType,
  type CanonicalAssetFileEntry,
  type FieldContribution,
  type ObservedFieldType,
} from "./canonical";
import { parseStaticMemberPath } from "@webstudio-is/expression";

type AggregatedFieldType = {
  type: ObservedFieldType;
  occurrences: number;
};

type AggregatedAssetField = {
  path: string;
  occurrences: number;
  types: AggregatedFieldType[];
  optional: boolean;
  mixed: boolean;
};

type AggregatedAssetFieldCatalog = {
  projectId?: string;
  documentCount: number;
  fields: AggregatedAssetField[];
};

type AssetFieldCatalog = AggregatedAssetFieldCatalog & {
  format: "webstudio-asset-field-catalog";
  version: 1;
  canonicalRevision: string;
};

export const computeCanonicalAssetRevision = async (
  entries: readonly CanonicalAssetFileEntry[]
) => {
  const serialized = serializeJsonDeterministically(
    [...entries]
      .sort(
        (left, right) =>
          compareStrings(left.projectId, right.projectId) ||
          compareStrings(left.assetId, right.assetId) ||
          compareStrings(left.revision, right.revision)
      )
      .map((entry) => ({
        projectId: entry.projectId,
        assetId: entry.assetId,
        revision: entry.revision,
        document: entry.document,
      }))
  );
  return await sha256(serialized);
};

const getStandardFieldContributions = (
  document: AssetFileDocument
): FieldContribution[] => [
  { path: "_id", type: "string" },
  { path: "_type", type: "string" },
  ...assetQueryStandardFields.flatMap((field): FieldContribution[] => {
    if (field === "id" || isAssetQueryRuntimeField(field)) {
      return [];
    }
    const value = document[field];
    return value === undefined
      ? []
      : [{ path: field, type: getObservedFieldType(value) }];
  }),
  { path: "contentRef", type: "string" },
  { path: "properties", type: "object" },
  ...(document.metadataError === undefined
    ? []
    : [
        { path: "metadataError", type: "object" } as const,
        { path: "metadataError.code", type: "string" } as const,
        { path: "metadataError.message", type: "string" } as const,
      ]),
];

type MutableField = {
  occurrences: number;
  typeOccurrences: Map<ObservedFieldType, number>;
};

type EntryFields = Map<string, Set<ObservedFieldType>>;

const getEntryFields = (entry: CanonicalAssetFileEntry): EntryFields => {
  const fields = new Map<string, Set<ObservedFieldType>>();
  for (const contribution of [
    ...getStandardFieldContributions(entry.document),
    ...getFieldContributions(entry.document.properties),
  ]) {
    const types = fields.get(contribution.path) ?? new Set();
    types.add(contribution.type);
    fields.set(contribution.path, types);
  }
  return fields;
};

const normalizeCatalogEntry = (entry: CanonicalAssetFileEntry) => {
  const normalized = createCanonicalAssetFileEntry({
    projectId: entry.projectId,
    document: entry.document,
  });
  if (
    normalized.assetId !== entry.assetId ||
    normalized.revision !== entry.revision
  ) {
    throw new Error("Asset field catalog entry is inconsistent");
  }
  return normalized;
};

const aggregateCatalogEntries = (
  entries: readonly CanonicalAssetFileEntry[]
) => {
  const normalizedEntries: CanonicalAssetFileEntry[] = [];
  const assetIds = new Set<string>();
  const fields = new Map<string, MutableField>();
  let projectId: string | undefined;
  for (const entry of entries) {
    const normalized = normalizeCatalogEntry(entry);
    if (assetIds.has(normalized.assetId)) {
      throw new Error("Asset field catalog contains duplicate asset entries");
    }
    if (projectId !== undefined && projectId !== normalized.projectId) {
      throw new Error("Asset field catalog cannot combine multiple projects");
    }
    projectId = normalized.projectId;
    assetIds.add(normalized.assetId);
    normalizedEntries.push(normalized);
    for (const [path, types] of getEntryFields(normalized)) {
      const field = fields.get(path) ?? {
        occurrences: 0,
        typeOccurrences: new Map<ObservedFieldType, number>(),
      };
      field.occurrences += 1;
      for (const type of types) {
        field.typeOccurrences.set(
          type,
          (field.typeOccurrences.get(type) ?? 0) + 1
        );
      }
      fields.set(path, field);
    }
  }
  const documentCount = normalizedEntries.length;
  return {
    entries: normalizedEntries,
    catalog: {
      ...(projectId === undefined ? {} : { projectId }),
      documentCount,
      fields: Array.from(fields, ([path, field]) => ({
        path,
        occurrences: field.occurrences,
        optional: field.occurrences < documentCount,
        types: Array.from(field.typeOccurrences, ([type, occurrences]) => ({
          type,
          occurrences,
        })).sort((left, right) => compareStrings(left.type, right.type)),
        mixed: field.typeOccurrences.size > 1,
      })).sort((left, right) => compareStrings(left.path, right.path)),
    } satisfies AggregatedAssetFieldCatalog,
  };
};

export const createAssetFieldCatalog = async (
  entries: readonly CanonicalAssetFileEntry[]
): Promise<AssetFieldCatalog> => {
  const aggregated = aggregateCatalogEntries(entries);
  return {
    format: "webstudio-asset-field-catalog",
    version: 1,
    canonicalRevision: await computeCanonicalAssetRevision(aggregated.entries),
    ...aggregated.catalog,
  };
};

const queryableStandardFields = new Set<string>(
  assetQueryStandardFields.filter((field) => field !== "id")
);

const getBuilderQueryPath = (path: string) => {
  if (path === "_id") {
    return ["id"];
  }
  if (queryableStandardFields.has(path)) {
    return [path];
  }
  const segments = parseStaticMemberPath(path);
  if (
    segments === undefined ||
    segments.length < 2 ||
    segments[0] !== "properties"
  ) {
    return;
  }
  return segments;
};

export const toBuilderAssetFieldCatalog = (
  catalog: AssetFieldCatalog
): BuilderAssetFieldCatalog =>
  builderAssetFieldCatalog.parse({
    format: "webstudio-builder-asset-field-catalog",
    version: 1,
    canonicalRevision: catalog.canonicalRevision,
    documentCount: catalog.documentCount,
    fields: Object.fromEntries(
      catalog.fields.map((field) => {
        const queryPath = getBuilderQueryPath(field.path);
        return [
          field.path,
          {
            ...(queryPath === undefined ? {} : { queryPath }),
            types: field.types.map(({ type }) => type),
            occurrences: field.occurrences,
            ...(field.optional ? { optional: true } : {}),
            ...(field.mixed ? { mixed: true } : {}),
          },
        ];
      })
    ),
  });
