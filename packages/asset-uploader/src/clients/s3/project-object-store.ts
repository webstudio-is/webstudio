import type { SignatureV4 } from "@smithy/signature-v4";
import { XMLParser } from "fast-xml-parser";
import {
  compareStrings,
  encodeObjectProjectHead,
  parseObjectProjectHead,
  prependStoragePrefix,
  validateStorageKey,
  type ObjectProjectSnapshotReference,
  type ObjectStore,
  type ProjectAssetReadRange,
  type ProjectHead,
  type ProjectHeadStore,
  type ProjectHeadUpdateResult,
} from "@webstudio-is/project-store";
import { createS3ObjectUrl } from "./object-url";
import { createS3FetchHeaders, signS3Request } from "./request-headers";

type S3ObjectStoreOptions = {
  signer: SignatureV4;
  endpoint: string;
  bucket: string;
  prefix: string;
};

const xmlParser = new XMLParser({ parseTagValue: false });

const toArray = <Value>(value: Value | Value[] | undefined): Value[] => {
  if (value === undefined) {
    return [];
  }
  return Array.isArray(value) ? value : [value];
};

export class S3ProjectObjectStore
  implements ObjectStore, ProjectHeadStore<ObjectProjectSnapshotReference>
{
  private readonly signer: SignatureV4;
  private readonly endpoint: string;
  private readonly bucket: string;
  private readonly prefix: string;

  constructor({ signer, endpoint, bucket, prefix }: S3ObjectStoreOptions) {
    validateStorageKey(prefix, true);
    this.signer = signer;
    this.endpoint = endpoint;
    this.bucket = bucket;
    this.prefix = prefix;
  }

  private key(key: string, allowEmpty = false) {
    validateStorageKey(key, allowEmpty);
    return prependStoragePrefix(this.prefix, key);
  }

  private async request({
    method,
    key,
    headers = {},
    body,
    query,
  }: {
    method: "GET" | "PUT" | "DELETE";
    key?: string;
    headers?: Record<string, string>;
    body?: ArrayBuffer;
    query?: Record<string, string>;
  }) {
    const url =
      key === undefined
        ? new URL(`/${this.bucket}`, this.endpoint)
        : createS3ObjectUrl({
            endpoint: this.endpoint,
            bucket: this.bucket,
            key,
            keyType: "hierarchical",
          });
    for (const [name, value] of Object.entries(query ?? {})) {
      url.searchParams.set(name, value);
    }
    const request = await signS3Request({
      signer: this.signer,
      url,
      method,
      query,
      headers: {
        "x-amz-content-sha256": "UNSIGNED-PAYLOAD",
        ...headers,
      },
      body,
    });
    return await fetch(url, {
      method: request.method,
      headers: createS3FetchHeaders(request.headers),
      ...(body === undefined ? {} : { body }),
    });
  }

  private async read(key: string, range?: ProjectAssetReadRange) {
    const response = await this.request({
      method: "GET",
      key: this.key(key),
      headers:
        range === undefined
          ? undefined
          : {
              Range: `bytes=${range.offset}-${range.offset + range.length - 1}`,
            },
    });
    if (response.status === 404) {
      return;
    }
    if (response.ok === false) {
      throw new Error(`Cannot read project object (${response.status})`);
    }
    return response;
  }

  async get(key: string, range?: ProjectAssetReadRange) {
    const response = await this.read(key, range);
    return response === undefined
      ? undefined
      : new Uint8Array(await response.arrayBuffer());
  }

  private async write({
    key,
    value,
    condition,
    cacheControl = "private, max-age=31536000, immutable",
  }: {
    key: string;
    value: Uint8Array;
    condition?: { ifMatch?: string; ifNoneMatch?: "*" };
    cacheControl?: string;
  }) {
    const body = Uint8Array.from(value).buffer;
    return await this.request({
      method: "PUT",
      key: this.key(key),
      body,
      headers: {
        "Content-Length": String(body.byteLength),
        "Content-Type": "application/octet-stream",
        "Cache-Control": cacheControl,
        ...(condition?.ifMatch === undefined
          ? {}
          : { "If-Match": condition.ifMatch }),
        ...(condition?.ifNoneMatch === undefined
          ? {}
          : { "If-None-Match": condition.ifNoneMatch }),
      },
    });
  }

  async put(key: string, value: Uint8Array) {
    const response = await this.write({ key, value });
    if (response.ok === false) {
      throw new Error(`Cannot persist project object (${response.status})`);
    }
  }

  async putIfAbsent(key: string, value: Uint8Array) {
    const response = await this.write({
      key,
      value,
      condition: { ifNoneMatch: "*" },
    });
    if (response.status === 409 || response.status === 412) {
      return "existing" as const;
    }
    if (response.ok === false) {
      throw new Error(`Cannot persist project object (${response.status})`);
    }
    return "written" as const;
  }

  async delete(key: string) {
    const response = await this.request({
      method: "DELETE",
      key: this.key(key),
    });
    if (response.ok === false && response.status !== 404) {
      throw new Error(`Cannot delete project object (${response.status})`);
    }
  }

  async list(prefix: string) {
    validateStorageKey(prefix, true);
    const root = this.key("", true);
    const storagePrefix =
      prefix === "" ? (root === "" ? "" : `${root}/`) : `${this.key(prefix)}/`;
    const keys: string[] = [];
    let continuationToken: string | undefined;
    const visitedTokens = new Set<string>();
    do {
      const query = {
        "list-type": "2",
        prefix: storagePrefix,
        ...(continuationToken === undefined
          ? {}
          : { "continuation-token": continuationToken }),
      };
      const response = await this.request({ method: "GET", query });
      if (response.ok === false) {
        throw new Error(`Cannot list project objects (${response.status})`);
      }
      const parsed = xmlParser.parse(await response.text()) as {
        ListBucketResult?: {
          Contents?: { Key?: unknown } | Array<{ Key?: unknown }>;
          IsTruncated?: unknown;
          NextContinuationToken?: unknown;
        };
      };
      const result = parsed.ListBucketResult;
      if (result === undefined) {
        throw new Error("Project object list response is invalid");
      }
      for (const item of toArray(result.Contents)) {
        if (
          typeof item.Key !== "string" ||
          item.Key.startsWith(storagePrefix) === false
        ) {
          throw new Error("Project object list contains an invalid key");
        }
        const key =
          this.prefix === ""
            ? item.Key
            : item.Key.slice(this.prefix.length + 1);
        validateStorageKey(key);
        keys.push(key);
      }
      const truncated = result.IsTruncated === "true";
      if (truncated) {
        if (typeof result.NextContinuationToken !== "string") {
          throw new Error(
            "Project object list is truncated without a continuation token"
          );
        }
        if (visitedTokens.has(result.NextContinuationToken)) {
          throw new Error(
            "Project object list returned a repeated continuation token"
          );
        }
        continuationToken = result.NextContinuationToken;
        visitedTokens.add(continuationToken);
      } else {
        continuationToken = undefined;
      }
    } while (continuationToken !== undefined);
    return keys.sort(compareStrings);
  }

  private headKey(name: string) {
    validateStorageKey(name);
    return `heads/${name}.json`;
  }

  private async readHeadObject(name: string) {
    const response = await this.read(this.headKey(name));
    if (response === undefined) {
      return;
    }
    const etag = response.headers.get("etag");
    if (etag === null) {
      throw new Error("Project head has no ETag");
    }
    const bytes = new Uint8Array(await response.arrayBuffer());
    return { etag, head: await parseObjectProjectHead(bytes) };
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
    const response = await this.write({
      key: this.headKey(name),
      value: bytes,
      cacheControl: "private, no-store",
      condition:
        current === undefined
          ? { ifNoneMatch: "*" }
          : { ifMatch: current.etag },
    });
    if (response.status === 409 || response.status === 412) {
      const latest = await this.getHead(name);
      return {
        status: "conflict",
        ...(latest === undefined ? {} : { head: latest }),
      };
    }
    if (response.ok === false) {
      throw new Error(`Cannot update project head (${response.status})`);
    }
    return { status: "updated", head: await parseObjectProjectHead(bytes) };
  }
}
