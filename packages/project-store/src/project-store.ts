import { isContentHash, sha256 } from "./hash";
import type { ObjectStore, ProjectHeadStore } from "./object-store";
import { compareStrings, serializeJsonDeterministically } from "./stable-json";
import type {
  JsonValue,
  ObjectProjectSnapshotReference,
  ObjectReference,
  ProjectHead,
  ProjectHeadUpdateResult,
  ProjectSnapshot,
  ProjectSnapshotInput,
  ProjectSnapshotManifest,
  ProjectSnapshotReference,
} from "./types";

const encoder = new TextEncoder();
const decoder = new TextDecoder();

const objectKey = (reference: ObjectReference) =>
  `objects/${reference.hash.slice("sha256:".length)}`;

const isObjectReference = (value: unknown): value is ObjectReference => {
  if (value === null || typeof value !== "object") {
    return false;
  }
  const reference = value as Partial<ObjectReference>;
  return (
    isContentHash(reference.hash) &&
    typeof reference.size === "number" &&
    Number.isSafeInteger(reference.size) &&
    reference.size >= 0
  );
};

const validateCollectionName = (name: string) => {
  if (
    name.length === 0 ||
    name.startsWith("/") ||
    name.endsWith("/") ||
    name
      .split("/")
      .some((segment) => segment === "" || segment === "." || segment === "..")
  ) {
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
    typeof manifest.builderRevision !== "string" ||
    typeof manifest.assetRevision !== "string" ||
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

export interface ProjectStore<
  Reference extends ProjectSnapshotReference = ProjectSnapshotReference,
> {
  writeSnapshot(input: ProjectSnapshotInput): Promise<Reference>;
  readSnapshotManifest(reference: Reference): Promise<ProjectSnapshotManifest>;
  readCollections(input: {
    reference: Reference;
    names: readonly string[];
  }): Promise<Readonly<Record<string, JsonValue>>>;
  readSnapshot(reference: Reference): Promise<ProjectSnapshot<Reference>>;
  getHead(name: string): Promise<ProjectHead<Reference> | undefined>;
  updateHead(input: {
    name: string;
    expectedRevision?: ProjectHead<Reference>["revision"];
    reference: Reference;
  }): Promise<ProjectHeadUpdateResult<Reference>>;
}

export class ObjectProjectStore implements ProjectStore<ObjectProjectSnapshotReference> {
  private readonly objects: ObjectStore;
  private readonly heads: ProjectHeadStore<ObjectProjectSnapshotReference>;

  constructor(
    objects: ObjectStore,
    heads: ProjectHeadStore<ObjectProjectSnapshotReference>
  ) {
    this.objects = objects;
    this.heads = heads;
  }

  private async writeObject(value: JsonValue): Promise<ObjectReference> {
    const bytes = encoder.encode(serializeJsonDeterministically(value));
    const reference = await createReference(bytes);
    const key = objectKey(reference);
    const existing = await this.objects.get(key);
    if (existing !== undefined) {
      await verifyObject({ bytes: existing, reference });
      return reference;
    }
    await this.objects.put(key, bytes);
    const stored = await this.objects.get(key);
    if (stored === undefined) {
      throw new Error(`Project object ${reference.hash} was not persisted`);
    }
    await verifyObject({ bytes: stored, reference });
    return reference;
  }

  async writeSnapshot(input: ProjectSnapshotInput) {
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
      object: await this.writeObject(manifest),
    } as const;
  }

  private async readObject(reference: ObjectReference): Promise<Uint8Array> {
    const bytes = await this.objects.get(objectKey(reference));
    if (bytes === undefined) {
      throw new Error(`Project object ${reference.hash} is missing`);
    }
    await verifyObject({ bytes, reference });
    return bytes;
  }

  async readSnapshotManifest(reference: ObjectProjectSnapshotReference) {
    if (
      reference.storage !== "object" ||
      isObjectReference(reference.object) === false
    ) {
      throw new Error("Project snapshot reference is invalid");
    }
    return parseManifest(
      JSON.parse(decoder.decode(await this.readObject(reference.object)))
    );
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
        return [
          name,
          JSON.parse(
            decoder.decode(await this.readObject(collection))
          ) as JsonValue,
        ] as const;
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
          JSON.parse(
            decoder.decode(await this.readObject(collection))
          ) as JsonValue,
        ])
      )
    );
    return {
      reference,
      manifest,
      collections,
    } satisfies ProjectSnapshot<ObjectProjectSnapshotReference>;
  }

  async getHead(name: string) {
    return await this.heads.getHead(name);
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
