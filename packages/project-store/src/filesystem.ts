import { basename, dirname, join, relative, resolve, sep } from "node:path";
import {
  mkdir,
  open,
  readFile,
  readdir,
  rename,
  rm,
  stat,
  writeFile,
} from "node:fs/promises";
import type { ObjectStore, ProjectHeadStore } from "./object-store";
import {
  encodeObjectProjectHead,
  parseObjectProjectHead,
} from "./project-head";
import { compareStrings } from "./stable-json";
import { validateStorageKey } from "./storage-key";
import type {
  ObjectProjectSnapshotReference,
  ProjectHead,
  ProjectHeadUpdateResult,
} from "./types";

const isMissing = (error: unknown) =>
  error instanceof Error && "code" in error && error.code === "ENOENT";

const isExisting = (error: unknown) =>
  error instanceof Error && "code" in error && error.code === "EEXIST";

const staleHeadLockAge = 30_000;

export class FilesystemObjectStore
  implements ObjectStore, ProjectHeadStore<ObjectProjectSnapshotReference>
{
  private readonly root: string;

  constructor(root: string) {
    this.root = resolve(root);
  }

  private path(key: string, allowEmpty = false) {
    validateStorageKey(key, allowEmpty);
    const path = resolve(this.root, ...key.split("/"));
    const relativePath = relative(this.root, path);
    if (
      relativePath === ".." ||
      relativePath.startsWith(`..${sep}`) ||
      relativePath === ""
    ) {
      if (allowEmpty && relativePath === "") {
        return path;
      }
      throw new Error(
        `Object key escapes its storage root: ${JSON.stringify(key)}`
      );
    }
    return path;
  }

  async get(key: string) {
    try {
      return new Uint8Array(await readFile(this.path(key)));
    } catch (error) {
      if (isMissing(error)) {
        return;
      }
      throw error;
    }
  }

  async put(key: string, value: Uint8Array) {
    const path = this.path(key);
    await mkdir(dirname(path), { recursive: true });
    const temporaryPath = join(
      dirname(path),
      `.${basename(path)}.${crypto.randomUUID()}.tmp`
    );
    try {
      await writeFile(temporaryPath, value, { flag: "wx" });
      await rename(temporaryPath, path);
    } finally {
      await rm(temporaryPath, { force: true });
    }
  }

  async delete(key: string) {
    await rm(this.path(key), { force: true });
  }

  async list(prefix: string) {
    validateStorageKey(prefix, true);
    const start = this.path(prefix, true);
    const keys: string[] = [];
    const visit = async (directory: string) => {
      let entries;
      try {
        entries = await readdir(directory, { withFileTypes: true });
      } catch (error) {
        if (isMissing(error)) {
          return;
        }
        throw error;
      }
      for (const entry of entries) {
        const path = join(directory, entry.name);
        if (entry.isDirectory()) {
          await visit(path);
        } else if (entry.isFile()) {
          keys.push(relative(this.root, path).split(sep).join("/"));
        }
      }
    };
    const startStat = await stat(start).catch((error) => {
      if (isMissing(error)) {
        return;
      }
      throw error;
    });
    if (startStat?.isFile()) {
      keys.push(relative(this.root, start).split(sep).join("/"));
    } else if (startStat?.isDirectory()) {
      await visit(start);
    }
    return keys.sort(compareStrings);
  }

  private headKey(name: string) {
    validateStorageKey(name);
    return `heads/${name}.json`;
  }

  async getHead(name: string) {
    const bytes = await this.get(this.headKey(name));
    return bytes === undefined
      ? undefined
      : await parseObjectProjectHead(bytes);
  }

  private async acquireLock(key: string) {
    const path = this.path(`${key}.lock`);
    await mkdir(dirname(path), { recursive: true });
    for (let attempt = 0; attempt < 100; attempt++) {
      try {
        const handle = await open(path, "wx");
        return async () => {
          await handle.close();
          await rm(path, { force: true });
        };
      } catch (error) {
        if (isExisting(error) === false) {
          throw error;
        }
        const lockStat = await stat(path).catch((statError) => {
          if (isMissing(statError)) {
            return;
          }
          throw statError;
        });
        if (
          lockStat !== undefined &&
          Date.now() - lockStat.mtimeMs > staleHeadLockAge
        ) {
          await rm(path, { force: true });
          continue;
        }
        await new Promise((resolveWait) => setTimeout(resolveWait, 10));
      }
    }
    throw new Error("Timed out waiting for project head lock");
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
    const key = this.headKey(name);
    const release = await this.acquireLock(key);
    try {
      const current = await this.getHead(name);
      if (current?.revision !== expectedRevision) {
        return {
          status: "conflict",
          ...(current === undefined ? {} : { head: current }),
        };
      }
      const bytes = encodeObjectProjectHead(reference);
      await this.put(key, bytes);
      return { status: "updated", head: await parseObjectProjectHead(bytes) };
    } finally {
      await release();
    }
  }
}
