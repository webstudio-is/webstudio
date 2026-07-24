import type { ObjectStore, ProjectHeadStore } from "./object-store";
import {
  encodeObjectProjectHead,
  parseObjectProjectHead,
} from "./project-head";
import { compareStrings } from "./stable-json";
import { prependStoragePrefix, validateStorageKey } from "./storage-key";
import type {
  ObjectProjectSnapshotReference,
  ProjectHead,
  ProjectHeadUpdateResult,
} from "./types";

type R2ObjectLike = {
  key: string;
  etag: string;
};

type R2ObjectBodyLike = R2ObjectLike & {
  arrayBuffer(): Promise<ArrayBuffer>;
};

type R2Conditional = {
  etagMatches?: string;
  etagDoesNotMatch?: string;
};

export interface R2BucketLike {
  get(key: string): Promise<R2ObjectBodyLike | null>;
  put(
    key: string,
    value: Uint8Array,
    options?: { onlyIf?: R2Conditional }
  ): Promise<R2ObjectLike | null>;
  delete(key: string): Promise<void>;
  list(options: { prefix: string; cursor?: string }): Promise<{
    objects: R2ObjectLike[];
    truncated: boolean;
    cursor?: string;
  }>;
}

export class R2ObjectStore
  implements ObjectStore, ProjectHeadStore<ObjectProjectSnapshotReference>
{
  private readonly bucket: R2BucketLike;
  private readonly prefix: string;

  constructor(bucket: R2BucketLike, prefix = "") {
    validateStorageKey(prefix, true);
    this.bucket = bucket;
    this.prefix = prefix;
  }

  private key(key: string, allowEmpty = false) {
    validateStorageKey(key, allowEmpty);
    return prependStoragePrefix(this.prefix, key);
  }

  async get(key: string) {
    const object = await this.bucket.get(this.key(key));
    return object === null
      ? undefined
      : new Uint8Array(await object.arrayBuffer());
  }

  async put(key: string, value: Uint8Array) {
    const result = await this.bucket.put(this.key(key), value);
    if (result === null) {
      throw new Error("R2 rejected an unconditional project object write");
    }
  }

  async delete(key: string) {
    await this.bucket.delete(this.key(key));
  }

  async list(prefix: string) {
    validateStorageKey(prefix, true);
    const storagePrefix =
      prefix === "" ? this.key("", true) : `${this.key(prefix)}/`;
    const keys: string[] = [];
    let cursor: string | undefined;
    do {
      const page = await this.bucket.list({
        prefix: storagePrefix,
        ...(cursor === undefined ? {} : { cursor }),
      });
      for (const object of page.objects) {
        const key =
          this.prefix === ""
            ? object.key
            : object.key.slice(this.prefix.length + 1);
        keys.push(key);
      }
      if (page.truncated && page.cursor === undefined) {
        throw new Error(
          "R2 returned a truncated project object list without a cursor"
        );
      }
      cursor = page.truncated ? page.cursor : undefined;
    } while (cursor !== undefined);
    return keys.sort(compareStrings);
  }

  private headKey(name: string) {
    validateStorageKey(name);
    return this.key(`heads/${name}.json`);
  }

  private async readHeadObject(name: string) {
    const object = await this.bucket.get(this.headKey(name));
    if (object === null) {
      return;
    }
    const bytes = new Uint8Array(await object.arrayBuffer());
    return { object, head: await parseObjectProjectHead(bytes) };
  }

  async getHead(name: string) {
    return (await this.readHeadObject(name))?.head;
  }

  async updateHead({
    name,
    expectedRevision,
    reference,
  }: {
    name: string;
    expectedRevision?: ProjectHead<ObjectProjectSnapshotReference>["revision"];
    reference: ObjectProjectSnapshotReference;
  }): Promise<ProjectHeadUpdateResult<ObjectProjectSnapshotReference>> {
    const current = await this.readHeadObject(name);
    if (current?.head.revision !== expectedRevision) {
      return {
        status: "conflict",
        ...(current === undefined ? {} : { head: current.head }),
      };
    }
    const bytes = encodeObjectProjectHead(reference);
    const written = await this.bucket.put(this.headKey(name), bytes, {
      onlyIf:
        current === undefined
          ? { etagDoesNotMatch: "*" }
          : { etagMatches: current.object.etag },
    });
    if (written === null) {
      const latest = await this.getHead(name);
      return {
        status: "conflict",
        ...(latest === undefined ? {} : { head: latest }),
      };
    }
    return { status: "updated", head: await parseObjectProjectHead(bytes) };
  }
}
