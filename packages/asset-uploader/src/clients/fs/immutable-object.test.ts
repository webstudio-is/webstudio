import { afterEach, describe, expect, test } from "vitest";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { createFsImmutableResourceIndexStore } from "./immutable-object";

describe("filesystem immutable resource index storage", () => {
  let directory: string | undefined;
  afterEach(async () => {
    if (directory !== undefined) {
      await rm(directory, { recursive: true, force: true });
    }
  });

  test("creates once, accepts identical bytes, and rejects collisions", async () => {
    directory = await mkdtemp(join(tmpdir(), "asset-index-"));
    const store = createFsImmutableResourceIndexStore(directory);
    const object = {
      key: "projects/one/index.json",
      data: new TextEncoder().encode("one"),
      checksum: `sha256:${"a".repeat(64)}`,
      contentType: "application/json" as const,
    };
    await expect(store.putIfAbsent(object)).resolves.toMatchObject({
      status: "created",
    });
    await expect(store.putIfAbsent(object)).resolves.toMatchObject({
      status: "exists",
    });
    await expect(
      store.putIfAbsent({
        ...object,
        data: new TextEncoder().encode("two"),
      })
    ).rejects.toThrow("other bytes");
    await expect(
      readFile(join(directory, "projects/one/index.json"), "utf8")
    ).resolves.toBe("one");
    const stored = await store.read?.(object.key);
    const chunks: Uint8Array[] = [];
    for await (const chunk of stored?.data ?? []) {
      chunks.push(chunk);
    }
    expect(Buffer.concat(chunks).toString("utf8")).toBe("one");
    expect(stored?.contentLength).toBe(3);
    await expect(store.delete?.(object.key)).resolves.toBe("deleted");
    await expect(store.delete?.(object.key)).resolves.toBe("missing");
  });
});
