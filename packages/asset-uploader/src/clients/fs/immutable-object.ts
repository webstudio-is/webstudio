import { createReadStream } from "node:fs";
import { mkdir, readFile, stat, unlink, writeFile } from "node:fs/promises";
import { dirname, resolve, sep } from "node:path";
import type { ImmutableAssetResourceIndexStore } from "@webstudio-is/asset-resource";

export const createFsImmutableResourceIndexStore = (
  directory: string
): ImmutableAssetResourceIndexStore => {
  const resolvePath = (key: string) => {
    const root = resolve(directory);
    const path = resolve(root, key);
    if (path === root || path.startsWith(`${root}${sep}`) === false) {
      throw new Error("Resource index path escapes immutable storage");
    }
    return path;
  };
  return {
    putIfAbsent: async (object) => {
      const path = resolvePath(object.key);
      await mkdir(dirname(path), { recursive: true });
      try {
        await writeFile(path, object.data, { flag: "wx" });
        return { status: "created", checksum: object.checksum };
      } catch (error) {
        if (
          error instanceof Error &&
          "code" in error &&
          error.code === "EEXIST"
        ) {
          const existing = await readFile(path);
          if (existing.equals(Buffer.from(object.data)) === false) {
            throw new Error("Immutable resource index already has other bytes");
          }
          return { status: "exists", checksum: object.checksum };
        }
        throw error;
      }
    },
    read: async (key) => {
      const path = resolvePath(key);
      const file = await stat(path);
      return { data: createReadStream(path), contentLength: file.size };
    },
    delete: async (key) => {
      try {
        await unlink(resolvePath(key));
        return "deleted";
      } catch (error) {
        if (
          error instanceof Error &&
          "code" in error &&
          error.code === "ENOENT"
        ) {
          return "missing";
        }
        throw error;
      }
    },
  };
};
