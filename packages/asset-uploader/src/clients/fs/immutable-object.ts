import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve, sep } from "node:path";
import type { ImmutableAssetResourceIndexStore } from "@webstudio-is/asset-resource";

export const createFsImmutableResourceIndexStore = (
  directory: string
): ImmutableAssetResourceIndexStore => ({
  putIfAbsent: async (object) => {
    const root = resolve(directory);
    const path = resolve(root, object.key);
    if (path === root || path.startsWith(`${root}${sep}`) === false) {
      throw new Error("Resource index path escapes immutable storage");
    }
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
});
