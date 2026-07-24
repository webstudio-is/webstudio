import { sha256 } from "./hash";
import { validateProjectAssetReadRange } from "./asset-range";
import type { ObjectStore, ProjectHeadStore } from "./object-store";
import { isObjectReference } from "./object-reference";
import { isProjectSnapshotReference } from "./snapshot-reference";
import { compareStrings, serializeJsonDeterministically } from "./stable-json";
import { commitProjectSnapshot } from "./snapshot-commit";
import { validateStorageKey } from "./storage-key";
import type {
  JsonValue,
  ObjectProjectAssetReference,
  ObjectProjectSnapshot,
  ObjectProjectSnapshotReference,
  ObjectReference,
  ProjectAssetReference,
  ProjectAssetReadRange,
  ProjectHead,
  ProjectHeadUpdateResult,
  ProjectSnapshot,
  ProjectSnapshotCommitInput,
  ProjectSnapshotInput,
  ProjectSnapshotManifest,
  ProjectSnapshotReference,
} from "./types";

const encoder = new TextEncoder();
const decoder = new TextDecoder("utf-8", { fatal: true });

const objectKey = (reference: ObjectReference) =>
  `objects/${reference.hash.slice("sha256:".length)}`;

const assetKey = (reference: ObjectReference) =>
  `sha256/${reference.hash.slice("sha256:".length)}`;

const validateCollectionName = (name: string) => {
  try {
    validateStorageKey(name);
  } catch {
    throw new Error(`Invalid project collection name ${JSON.stringify(name)}`);
  }
};

const parseManifest = (value: unknown): ProjectSnapshotManifest => {
  if (value === null || typeof value !== "object") {
    throw new Error("Project snapshot manifest is invalid");
  }
  const manifest = value as Partial<ProjectSnapshotManifest>;
  if (
    manifest.format !== "webstudio-project-snapshot" ||
    manifest.version !== 1 ||
    typeof manifest.projectId !== "string" ||
    manifest.projectId.length === 0 ||
    typeof manifest.builderRevision !== "string" ||
    manifest.builderRevision.length === 0 ||
    typeof manifest.assetRevision !== "string" ||
    manifest.assetRevision.length === 0 ||
    manifest.collections === null ||
    typeof manifest.collections !== "object" ||
    Array.isArray(manifest.collections)
  ) {
    throw new Error("Project snapshot manifest is invalid");
  }
  for (const [name, reference] of Object.entries(manifest.collections)) {
    validateCollectionName(name);
    if (isObjectReference(reference) === false) {
      throw new Error("Project snapshot collection reference is invalid");
    }
  }
  return manifest as ProjectSnapshotManifest;
};

const createReference = async (
  bytes: Uint8Array
): Promise<ObjectReference> => ({
  hash: await sha256(bytes),
  size: bytes.byteLength,
});

const verifyObject = async ({
  bytes,
  reference,
}: {
  bytes: Uint8Array;
  reference: ObjectReference;
}) => {
  if (
    bytes.byteLength !== reference.size ||
    (await sha256(bytes)) !== reference.hash
  ) {
    throw new Error(
      `Project object ${reference.hash} failed integrity validation`
    );
  }
};

const writeContentAddressedBytes = async ({
  store,
  key,
  bytes,
}: {
  store: ObjectStore;
  key: (reference: ObjectReference) => string;
  bytes: Uint8Array;
}) => {
  const reference = await createReference(bytes);
  const objectKey = key(reference);
  const status = await store.putIfAbsent(objectKey, bytes);
  if (status === "existing") {
    const existing = await store.get(objectKey);
    if (existing === undefined) {
      throw new Error(`Project object ${reference.hash} is missing`);
    }
    await verifyObject({ bytes: existing, reference });
  }
  return reference;
};

const readContentAddressedBytes = async ({
  store,
  key,
  reference,
}: {
  store: ObjectStore;
  key: (reference: ObjectReference) => string;
  reference: ObjectReference;
}) => {
  const bytes = await store.get(key(reference));
  if (bytes === undefined) {
    throw new Error(`Project object ${reference.hash} is missing`);
  }
  await verifyObject({ bytes, reference });
  return bytes;
};

export interface ProjectSnapshotReader<
  Reference extends ProjectSnapshotReference = ProjectSnapshotReference,
> {
  readCollections(input: {
    reference: Reference;
    names: readonly string[];
  }): Promise<Readonly<Record<string, JsonValue>>>;
  readSnapshot(reference: Reference): Promise<ProjectSnapshot<Reference>>;
}

export interface ProjectSnapshotCommitter<
  Reference extends ProjectSnapshotReference = ProjectSnapshotReference,
> {
  commitSnapshot(
    input: ProjectSnapshotCommitInput
  ): Promise<ProjectHeadUpdateResult<Reference>>;
}

export interface ProjectAssetReader<
  AssetReference extends ProjectAssetReference = ProjectAssetReference,
> {
  readAsset(
    reference: AssetReference,
    range?: ProjectAssetReadRange
  ): Promise<Uint8Array>;
}

export interface ProjectAssetWriter<
  AssetReference extends ProjectAssetReference = ProjectAssetReference,
> {
  writeAsset(value: Uint8Array): Promise<AssetReference>;
}

export interface ProjectHeadReader<
  Reference extends ProjectSnapshotReference = ProjectSnapshotReference,
> {
  getHead(name: string): Promise<ProjectHead<Reference> | undefined>;
}

export interface ProjectStore<
  Reference extends ProjectSnapshotReference = ProjectSnapshotReference,
  AssetReference extends ProjectAssetReference = ProjectAssetReference,
>
  extends
    ProjectSnapshotReader<Reference>,
    ProjectSnapshotCommitter<Reference>,
    ProjectAssetReader<AssetReference>,
    ProjectAssetWriter<AssetReference>,
    ProjectHeadReader<Reference> {}

export interface ProjectSnapshotWriter<
  Reference extends ProjectSnapshotReference = ProjectSnapshotReference,
> {
  writeSnapshot(input: ProjectSnapshotInput): Promise<Reference>;
}

export class ObjectProjectStore
  implements
    ProjectStore<ObjectProjectSnapshotReference, ObjectProjectAssetReference>,
    ProjectSnapshotWriter<ObjectProjectSnapshotReference>
{
  private readonly projectId: string;
  private readonly objects: ObjectStore;
  private readonly assets: ObjectStore;
  private readonly heads: ProjectHeadStore<ObjectProjectSnapshotReference>;

  constructor({
    projectId,
    objects,
    assets,
    heads,
  }: {
    projectId: string;
    objects: ObjectStore;
    assets: ObjectStore;
    heads: ProjectHeadStore<ObjectProjectSnapshotReference>;
  }) {
    if (projectId.length === 0) {
      throw new Error("Project store requires a project id");
    }
    this.projectId = projectId;
    this.objects = objects;
    this.assets = assets;
    this.heads = heads;
  }

  private async writeObject(value: JsonValue): Promise<ObjectReference> {
    const bytes = encoder.encode(serializeJsonDeterministically(value));
    return await writeContentAddressedBytes({
      store: this.objects,
      key: objectKey,
      bytes,
    });
  }

  async writeSnapshot(input: ProjectSnapshotInput) {
    if (input.projectId !== this.projectId) {
      throw new Error("Project snapshot belongs to a different project");
    }
    if (
      input.builderRevision.length === 0 ||
      input.assetRevision.length === 0
    ) {
      throw new Error("Project snapshot revisions cannot be empty");
    }
    const collectionEntries = await Promise.all(
      Object.entries(input.collections)
        .sort(([left], [right]) => compareStrings(left, right))
        .map(async ([name, value]) => {
          validateCollectionName(name);
          return [name, await this.writeObject(value)] as const;
        })
    );
    const manifest = {
      format: "webstudio-project-snapshot",
      version: 1,
      projectId: input.projectId,
      builderRevision: input.builderRevision,
      assetRevision: input.assetRevision,
      collections: Object.fromEntries(collectionEntries),
    } satisfies ProjectSnapshotManifest;
    return {
      storage: "object",
      type: "snapshot",
      object: await this.writeObject(manifest),
    } as const;
  }

  async commitSnapshot({
    headName,
    expectedRevision,
    snapshot,
  }: ProjectSnapshotCommitInput) {
    return await commitProjectSnapshot({
      input: { headName, expectedRevision, snapshot },
      getHead: (name) => this.getHead(name),
      writeSnapshot: (input) => this.writeSnapshot(input),
      updateHead: (input) => this.heads.updateHead(input),
    });
  }

  private async readObject(reference: ObjectReference): Promise<Uint8Array> {
    return await readContentAddressedBytes({
      store: this.objects,
      key: objectKey,
      reference,
    });
  }

  private async readJsonObject(reference: ObjectReference): Promise<JsonValue> {
    const bytes = await this.readObject(reference);
    let text: string;
    let value: unknown;
    try {
      text = decoder.decode(bytes);
      value = JSON.parse(text);
    } catch {
      throw new Error(`Project object ${reference.hash} contains invalid JSON`);
    }
    let canonical: string;
    try {
      canonical = serializeJsonDeterministically(value);
    } catch {
      throw new Error(`Project object ${reference.hash} contains invalid JSON`);
    }
    if (canonical !== text) {
      throw new Error(
        `Project object ${reference.hash} does not contain canonical JSON`
      );
    }
    return value as JsonValue;
  }

  async readSnapshotManifest(reference: ObjectProjectSnapshotReference) {
    if (
      isProjectSnapshotReference(reference) === false ||
      reference.storage !== "object"
    ) {
      throw new Error("Project snapshot reference is invalid");
    }
    const manifest = parseManifest(await this.readJsonObject(reference.object));
    if (manifest.projectId !== this.projectId) {
      throw new Error("Project snapshot belongs to a different project");
    }
    return manifest;
  }

  async readCollections({
    reference,
    names,
  }: {
    reference: ObjectProjectSnapshotReference;
    names: readonly string[];
  }) {
    const manifest = await this.readSnapshotManifest(reference);
    const entries = await Promise.all(
      [...new Set(names)].map(async (name) => {
        validateCollectionName(name);
        const collection = manifest.collections[name];
        if (collection === undefined) {
          throw new Error(
            `Project collection ${JSON.stringify(name)} is missing`
          );
        }
        return [name, await this.readJsonObject(collection)] as const;
      })
    );
    return Object.fromEntries(entries);
  }

  async readSnapshot(reference: ObjectProjectSnapshotReference) {
    const manifest = await this.readSnapshotManifest(reference);
    const collections = Object.fromEntries(
      await Promise.all(
        Object.entries(manifest.collections).map(async ([name, collection]) => [
          name,
          await this.readJsonObject(collection),
        ])
      )
    );
    return {
      reference,
      metadata: {
        projectId: manifest.projectId,
        builderRevision: manifest.builderRevision,
        assetRevision: manifest.assetRevision,
      },
      manifest,
      collections,
    } satisfies ObjectProjectSnapshot;
  }

  async writeAsset(value: Uint8Array) {
    const reference = await writeContentAddressedBytes({
      store: this.assets,
      key: assetKey,
      bytes: value,
    });
    return { storage: "object", type: "asset", object: reference } as const;
  }

  async readAsset(
    reference: ObjectProjectAssetReference,
    range?: ProjectAssetReadRange
  ) {
    if (
      reference.storage !== "object" ||
      reference.type !== "asset" ||
      isObjectReference(reference.object) === false
    ) {
      throw new Error("Project asset reference is invalid");
    }
    if (range === undefined) {
      return await readContentAddressedBytes({
        store: this.assets,
        key: assetKey,
        reference: reference.object,
      });
    }
    validateProjectAssetReadRange(range, reference.object.size);
    const bytes = await this.assets.get(assetKey(reference.object), range);
    if (bytes === undefined) {
      throw new Error(`Project object ${reference.object.hash} is missing`);
    }
    if (bytes.byteLength !== range.length) {
      throw new Error("Project asset range has an unexpected length");
    }
    return bytes;
  }

  async getHead(name: string) {
    const head = await this.heads.getHead(name);
    if (head !== undefined) {
      await this.readSnapshotManifest(head.reference);
    }
    return head;
  }

  async updateHead(input: {
    name: string;
    expectedRevision?: ProjectHead<ObjectProjectSnapshotReference>["revision"];
    reference: ObjectProjectSnapshotReference;
  }) {
    await this.readSnapshotManifest(input.reference);
    return await this.heads.updateHead(input);
  }
}
