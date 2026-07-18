import {
  builderAssetFieldCatalog,
  type AssetFileDocument,
  type BuilderAssetFieldCatalog,
} from "@webstudio-is/sdk";
import {
  createCanonicalAssetFileEntry,
  type CanonicalAssetFileEntry,
  type FieldContribution,
  type ObservedFieldType,
} from "./canonical";
import { serializeJsonDeterministically } from "./stable-json";
import { sha256 } from "./sha256";

export type AggregatedFieldType = {
  type: ObservedFieldType;
  occurrences: number;
};

export type AggregatedAssetField = {
  path: string;
  occurrences: number;
  types: AggregatedFieldType[];
  optional: boolean;
  mixed: boolean;
};

export type AggregatedAssetFieldCatalog = {
  projectId?: string;
  documentCount: number;
  fields: AggregatedAssetField[];
};

export type AssetFieldCatalog = AggregatedAssetFieldCatalog & {
  format: "webstudio-asset-field-catalog";
  version: 1;
  canonicalRevision: string;
};

const compareStrings = (left: string, right: string) => {
  if (left < right) {
    return -1;
  }
  if (left > right) {
    return 1;
  }
  return 0;
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
        fieldContributions: entry.fieldContributions,
      }))
  );
  return await sha256(serialized);
};

const getStandardFieldContributions = (
  document: AssetFileDocument
): FieldContribution[] => [
  { path: "_id", type: "string" },
  { path: "_type", type: "string" },
  { path: "name", type: "string" },
  { path: "path", type: "string" },
  { path: "key", type: "string" },
  ...(document.folderId === undefined
    ? []
    : [{ path: "folderId", type: "string" } as const]),
  { path: "extension", type: "string" },
  { path: "mimeType", type: "string" },
  { path: "size", type: "number" },
  { path: "revision", type: "string" },
  { path: "contentRef", type: "string" },
  { path: "properties", type: "object" },
  ...(document.excerpt === undefined
    ? []
    : [{ path: "excerpt", type: "string" } as const]),
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
    ...entry.fieldContributions,
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
    normalized.revision !== entry.revision ||
    serializeJsonDeterministically(normalized.fieldContributions) !==
      serializeJsonDeterministically(entry.fieldContributions)
  ) {
    throw new Error("Asset field catalog entry is inconsistent");
  }
  return normalized;
};

export class AssetFieldCatalogAccumulator {
  private projectId: string | undefined;
  private readonly entries = new Map<
    string,
    {
      projectId: string;
      fields: EntryFields;
      entry: CanonicalAssetFileEntry;
    }
  >();
  private readonly fields = new Map<string, MutableField>();

  private apply(fields: EntryFields, direction: 1 | -1) {
    for (const [path, types] of fields) {
      const field = this.fields.get(path) ?? {
        occurrences: 0,
        typeOccurrences: new Map(),
      };
      field.occurrences += direction;
      for (const type of types) {
        const occurrences = (field.typeOccurrences.get(type) ?? 0) + direction;
        if (occurrences === 0) {
          field.typeOccurrences.delete(type);
        } else {
          field.typeOccurrences.set(type, occurrences);
        }
      }
      if (field.occurrences === 0) {
        this.fields.delete(path);
      } else {
        this.fields.set(path, field);
      }
    }
  }

  upsert(entry: CanonicalAssetFileEntry) {
    const normalized = normalizeCatalogEntry(entry);
    if (
      this.projectId !== undefined &&
      this.projectId !== normalized.projectId
    ) {
      throw new Error("Asset field catalog cannot combine multiple projects");
    }
    this.projectId = normalized.projectId;

    const fields = getEntryFields(normalized);
    const previous = this.entries.get(normalized.assetId);
    if (previous !== undefined) {
      this.apply(previous.fields, -1);
    }
    this.apply(fields, 1);
    this.entries.set(normalized.assetId, {
      projectId: normalized.projectId,
      fields,
      entry: normalized,
    });
  }

  remove(assetId: string) {
    const previous = this.entries.get(assetId);
    if (previous === undefined) {
      return false;
    }
    this.apply(previous.fields, -1);
    this.entries.delete(assetId);
    return true;
  }

  snapshot(): AggregatedAssetFieldCatalog {
    return {
      ...(this.projectId === undefined ? {} : { projectId: this.projectId }),
      documentCount: this.entries.size,
      fields: Array.from(this.fields, ([path, field]) => ({
        path,
        occurrences: field.occurrences,
        optional: field.occurrences < this.entries.size,
        types: Array.from(field.typeOccurrences, ([type, occurrences]) => ({
          type,
          occurrences,
        })).sort((left, right) => compareStrings(left.type, right.type)),
        mixed: field.typeOccurrences.size > 1,
      })).sort((left, right) => compareStrings(left.path, right.path)),
    };
  }

  async versionedSnapshot(): Promise<AssetFieldCatalog> {
    return {
      format: "webstudio-asset-field-catalog",
      version: 1,
      canonicalRevision: await computeCanonicalAssetRevision(
        Array.from(this.entries.values(), ({ entry }) => entry)
      ),
      ...this.snapshot(),
    };
  }
}

export const aggregateAssetFields = (
  entries: readonly CanonicalAssetFileEntry[]
): AggregatedAssetFieldCatalog => {
  const accumulator = new AssetFieldCatalogAccumulator();
  const assetIds = new Set<string>();
  for (const entry of entries) {
    if (assetIds.has(entry.assetId)) {
      throw new Error("Asset field catalog contains duplicate asset entries");
    }
    assetIds.add(entry.assetId);
    accumulator.upsert(entry);
  }
  return accumulator.snapshot();
};

export const createAssetFieldCatalog = async (
  entries: readonly CanonicalAssetFileEntry[]
): Promise<AssetFieldCatalog> => {
  const accumulator = new AssetFieldCatalogAccumulator();
  const assetIds = new Set<string>();
  for (const entry of entries) {
    if (assetIds.has(entry.assetId)) {
      throw new Error("Asset field catalog contains duplicate asset entries");
    }
    assetIds.add(entry.assetId);
    accumulator.upsert(entry);
  }
  return await accumulator.versionedSnapshot();
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
      catalog.fields.map((field) => [
        field.path,
        {
          types: field.types.map(({ type }) => type),
          occurrences: field.occurrences,
          ...(field.optional ? { optional: true } : {}),
          ...(field.mixed ? { mixed: true } : {}),
        },
      ])
    ),
  });
