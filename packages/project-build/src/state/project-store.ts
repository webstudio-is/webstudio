import type {
  JsonValue,
  ProjectAssetReference,
  ProjectSnapshotInput,
} from "@webstudio-is/project-store";
import {
  compareStrings,
  isProjectAssetReference,
  normalizeJsonValue,
  serializeJsonDeterministically,
  sha256,
} from "@webstudio-is/project-store";
import {
  assetFileDocument,
  builderAssetFieldCatalog,
  getStyleDeclKey,
  type AssetFileDocument,
  type BuilderAssetFieldCatalog,
  type StyleDecl,
} from "@webstudio-is/sdk";
import {
  builderNamespaces,
  type BuilderNamespace,
  type WebstudioDataNamespace,
  webstudioDataNamespaces,
} from "../contracts/namespaces";
import { serializedBuilderState } from "../schema";
import type { BuilderState } from "./builder-state";
import {
  createBuilderStateFromSerializedSnapshot,
  createSerializedBuilderStateSnapshotFromState,
  type SerializedBuilderStateSnapshot,
} from "./adapters";

export const builderCollectionNameByNamespace = {
  pages: "builder/pages",
  instances: "builder/instances",
  props: "builder/props",
  styles: "builder/styles",
  styleSources: "builder/styleSources",
  styleSourceSelections: "builder/styleSourceSelections",
  dataSources: "builder/dataSources",
  resources: "builder/resources",
  assets: "assets/records",
  assetFolders: "assets/folders",
  breakpoints: "builder/breakpoints",
  projectSettings: "builder/projectSettings",
  marketplaceProduct: "builder/marketplaceProduct",
} as const satisfies Record<BuilderNamespace, string>;

export const builderAssetBlobCollectionName = "assets/blobs";
export const builderAssetDocumentCollectionName = "assets/documents";
export const builderAssetFieldCatalogCollectionName = "assets/field-catalog";

const encoder = new TextEncoder();

const builderAssetCollectionNames = [
  builderCollectionNameByNamespace.assets,
  builderCollectionNameByNamespace.assetFolders,
  builderAssetBlobCollectionName,
  builderAssetDocumentCollectionName,
  builderAssetFieldCatalogCollectionName,
] as const;

export const computeBuilderAssetRevision = async (
  collections: Readonly<Record<string, JsonValue>>
) =>
  await sha256(
    encoder.encode(
      serializeJsonDeterministically(
        Object.fromEntries(
          builderAssetCollectionNames.flatMap((name) => {
            const value = collections[name];
            return value === undefined ? [] : [[name, value]];
          })
        )
      )
    )
  );

const namespaceByCollectionName = new Map<string, BuilderNamespace>(
  Object.entries(builderCollectionNameByNamespace).map(
    ([namespace, collectionName]) => [
      collectionName,
      namespace as BuilderNamespace,
    ]
  )
);

type EntryNamespace = Exclude<WebstudioDataNamespace, "pages">;

const entryNamespaces = webstudioDataNamespaces.filter(
  (namespace): namespace is EntryNamespace => namespace !== "pages"
);

const getId = (value: unknown) => (value as { id: string }).id;

const getCanonicalEntryKeyByNamespace = {
  instances: getId,
  props: getId,
  styles: (value: unknown) => getStyleDeclKey(value as StyleDecl),
  styleSources: getId,
  styleSourceSelections: (value: unknown) =>
    (value as { instanceId: string }).instanceId,
  dataSources: getId,
  resources: getId,
  assets: getId,
  assetFolders: getId,
  breakpoints: getId,
} as const satisfies Record<EntryNamespace, (value: unknown) => string>;

const parseAssetReferences = (value: JsonValue | undefined) => {
  if (value === undefined) {
    return;
  }
  if (Array.isArray(value) === false) {
    throw new Error("Builder asset blob collection must be an entry array");
  }
  const references = new Map<string, ProjectAssetReference>();
  for (const entry of value) {
    if (
      Array.isArray(entry) === false ||
      entry.length !== 2 ||
      typeof entry[0] !== "string" ||
      isProjectAssetReference(entry[1]) === false
    ) {
      throw new Error(
        "Builder asset blob collection contains an invalid entry"
      );
    }
    if (references.has(entry[0])) {
      throw new Error(
        `Builder asset blob collection contains duplicate key ${JSON.stringify(entry[0])}`
      );
    }
    references.set(entry[0], entry[1]);
  }
  return references;
};

const canonicalizeEntryCollections = (
  snapshot: SerializedBuilderStateSnapshot
): SerializedBuilderStateSnapshot => {
  const canonical: Record<string, unknown> = { ...snapshot };
  for (const namespace of entryNamespaces) {
    const entries = canonical[namespace] as
      | readonly (readonly [string, unknown])[]
      | undefined;
    if (entries !== undefined) {
      const getCanonicalKey = getCanonicalEntryKeyByNamespace[namespace];
      const keys = new Set<string>();
      for (const [key, value] of entries) {
        if (keys.has(key)) {
          throw new Error(
            `Builder collection ${JSON.stringify(namespace)} contains duplicate key ${JSON.stringify(key)}`
          );
        }
        keys.add(key);
        if (key !== getCanonicalKey(value)) {
          throw new Error(
            `Builder collection ${JSON.stringify(namespace)} contains non-canonical key ${JSON.stringify(key)}`
          );
        }
      }
      canonical[namespace] = entries
        .slice()
        .sort(([left], [right]) => compareStrings(left, right));
    }
  }
  return canonical as SerializedBuilderStateSnapshot;
};

const validateAssetReferences = ({
  state,
  references,
}: {
  state: BuilderState;
  references: ReadonlyMap<string, ProjectAssetReference> | undefined;
}) => {
  const assets = state.assets;
  if (assets === undefined) {
    if (references !== undefined && references.size !== 0) {
      throw new Error(
        "Builder asset records and blob references must be stored together"
      );
    }
    return;
  }
  if (assets.size === 0) {
    if (references !== undefined && references.size !== 0) {
      throw new Error("Builder asset records and blob references do not match");
    }
    return;
  }
  if (references === undefined) {
    throw new Error(
      "Builder asset records and blob references must be stored together"
    );
  }
  if (assets.size !== references.size) {
    throw new Error("Builder asset records and blob references do not match");
  }
  for (const [assetId, asset] of assets) {
    const reference = references.get(assetId);
    if (reference === undefined) {
      throw new Error(
        `Builder asset ${JSON.stringify(assetId)} has no blob reference`
      );
    }
    if (
      reference.storage === "object" &&
      reference.object.size !== asset.size
    ) {
      throw new Error(
        `Builder asset ${JSON.stringify(assetId)} has an inconsistent object blob reference`
      );
    }
    if (
      reference.storage === "postgres" &&
      (reference.projectId !== asset.projectId ||
        reference.name !== asset.name ||
        reference.size !== asset.size)
    ) {
      throw new Error(
        `Builder asset ${JSON.stringify(assetId)} has an inconsistent PostgreSQL blob reference`
      );
    }
  }
};

const createAssetDocumentCollections = ({
  state,
  documents,
  fieldCatalog,
}: {
  state: BuilderState;
  documents: readonly AssetFileDocument[] | undefined;
  fieldCatalog: BuilderAssetFieldCatalog | undefined;
}): Readonly<Record<string, JsonValue>> => {
  if ((documents === undefined) !== (fieldCatalog === undefined)) {
    throw new Error(
      "Builder asset documents and field catalog must be stored together"
    );
  }
  if (documents === undefined || fieldCatalog === undefined) {
    return {};
  }
  const parsedDocuments = documents
    .map((document) => assetFileDocument.parse(document))
    .sort((left, right) => compareStrings(left._id, right._id));
  const assets = state.assets ?? new Map();
  if (parsedDocuments.length !== assets.size) {
    throw new Error("Builder asset documents do not match asset records");
  }
  for (const [index, document] of parsedDocuments.entries()) {
    if (index > 0 && parsedDocuments[index - 1]._id === document._id) {
      throw new Error("Builder asset documents contain duplicate asset ids");
    }
    const asset = assets.get(document._id);
    if (
      asset === undefined ||
      asset.size !== document.size ||
      asset.name !== document.contentRef
    ) {
      throw new Error("Builder asset document identity is inconsistent");
    }
  }
  const parsedCatalog = builderAssetFieldCatalog.parse(fieldCatalog);
  if (parsedCatalog.documentCount !== parsedDocuments.length) {
    throw new Error("Builder asset field catalog does not match its documents");
  }
  return {
    [builderAssetDocumentCollectionName]: normalizeJsonValue(parsedDocuments),
    [builderAssetFieldCatalogCollectionName]: normalizeJsonValue(parsedCatalog),
  };
};

const parseAssetDocumentCollections = ({
  state,
  collections,
}: {
  state: BuilderState;
  collections: Readonly<Record<string, JsonValue>>;
}) => {
  const documentsValue = collections[builderAssetDocumentCollectionName];
  const fieldCatalogValue = collections[builderAssetFieldCatalogCollectionName];
  if ((documentsValue === undefined) !== (fieldCatalogValue === undefined)) {
    throw new Error(
      "Builder asset documents and field catalog must be stored together"
    );
  }
  if (documentsValue === undefined || fieldCatalogValue === undefined) {
    return {};
  }
  if (Array.isArray(documentsValue) === false) {
    throw new Error("Builder asset document collection must be an array");
  }
  const assetDocuments = documentsValue.map((document) =>
    assetFileDocument.parse(document)
  );
  const assetFieldCatalog = builderAssetFieldCatalog.parse(fieldCatalogValue);
  createAssetDocumentCollections({
    state,
    documents: assetDocuments,
    fieldCatalog: assetFieldCatalog,
  });
  return { assetDocuments, assetFieldCatalog };
};

export const createBuilderProjectCollections = ({
  state,
  namespaces = builderNamespaces,
  assetReferences,
  assetDocuments,
  assetFieldCatalog,
}: {
  state: BuilderState;
  namespaces?: readonly BuilderNamespace[];
  assetReferences?: ReadonlyMap<string, ProjectAssetReference>;
  assetDocuments?: readonly AssetFileDocument[];
  assetFieldCatalog?: BuilderAssetFieldCatalog;
}) => {
  const selectedNamespaces = new Set(namespaces);
  const snapshot = createSerializedBuilderStateSnapshotFromState(state);
  const selectedSnapshot: Record<string, unknown> = {};
  for (const namespace of selectedNamespaces) {
    const value = snapshot[namespace];
    if (value !== undefined) {
      selectedSnapshot[namespace] = value;
    }
  }
  const parsed = canonicalizeEntryCollections(
    serializedBuilderState.parse(
      selectedSnapshot
    ) as SerializedBuilderStateSnapshot
  );
  const parsedState = createBuilderStateFromSerializedSnapshot(parsed);
  validateAssetReferences({ state: parsedState, references: assetReferences });
  const collections: Record<string, JsonValue> = {};
  for (const namespace of selectedNamespaces) {
    const value = parsed[namespace];
    if (value !== undefined) {
      collections[builderCollectionNameByNamespace[namespace]] =
        normalizeJsonValue(value);
    }
  }
  if (
    parsedState.assets !== undefined &&
    parsedState.assets.size !== 0 &&
    assetReferences !== undefined
  ) {
    collections[builderAssetBlobCollectionName] = normalizeJsonValue(
      [...parsedState.assets!.keys()].map((assetId) => [
        assetId,
        assetReferences.get(assetId)!,
      ])
    );
  }
  return {
    ...collections,
    ...(selectedNamespaces.has("assets")
      ? createAssetDocumentCollections({
          state: parsedState,
          documents: assetDocuments,
          fieldCatalog: assetFieldCatalog,
        })
      : {}),
  };
};

export const createBuilderProjectSnapshotInput = ({
  projectId,
  builderRevision,
  assetRevision,
  state,
  namespaces,
  assetReferences,
  assetDocuments,
  assetFieldCatalog,
}: {
  projectId: string;
  builderRevision: string;
  assetRevision: string;
  state: BuilderState;
  namespaces?: readonly BuilderNamespace[];
  assetReferences?: ReadonlyMap<string, ProjectAssetReference>;
  assetDocuments?: readonly AssetFileDocument[];
  assetFieldCatalog?: BuilderAssetFieldCatalog;
}): ProjectSnapshotInput => ({
  projectId,
  builderRevision,
  assetRevision,
  collections: createBuilderProjectCollections({
    state,
    namespaces,
    assetReferences,
    assetDocuments,
    assetFieldCatalog,
  }),
});

export const createBuilderProjectDataFromCollections = (
  collections: Readonly<Record<string, JsonValue>>
) => {
  const snapshot: Record<string, JsonValue> = {};
  for (const [collectionName, value] of Object.entries(collections)) {
    const namespace = namespaceByCollectionName.get(collectionName);
    if (namespace !== undefined) {
      snapshot[namespace] = value;
    }
  }
  const parsed = canonicalizeEntryCollections(
    serializedBuilderState.parse(snapshot) as SerializedBuilderStateSnapshot
  );
  const state = createBuilderStateFromSerializedSnapshot(parsed);
  const assetReferences = parseAssetReferences(
    collections[builderAssetBlobCollectionName]
  );
  validateAssetReferences({ state, references: assetReferences });
  return {
    state,
    assetReferences,
    ...parseAssetDocumentCollections({ state, collections }),
  };
};

export const createBuilderStateFromProjectCollections = (
  collections: Readonly<Record<string, JsonValue>>
) => createBuilderProjectDataFromCollections(collections).state;
