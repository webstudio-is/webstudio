import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, test } from "vitest";
import { readFromFs } from "./read";

const directories: string[] = [];
const collect = async (data: AsyncIterable<Uint8Array>) => {
  const chunks: number[] = [];
  for await (const chunk of data) {
    chunks.push(...chunk);
  }
  return new TextDecoder().decode(new Uint8Array(chunks));
};

afterEach(async () => {
  await Promise.all(
    directories.splice(0).map((directory) => rm(directory, { recursive: true }))
  );
});

describe("readFromFs", () => {
  test("reads complete files and bounded byte ranges", async () => {
    const directory = await mkdtemp(join(tmpdir(), "asset-read-"));
    directories.push(directory);
    await writeFile(join(directory, "post.md"), "0123456789");

    const complete = await readFromFs({
      name: "post.md",
      fileDirectory: directory,
    });
    const range = await readFromFs({
      name: "post.md",
      fileDirectory: directory,
      range: { offset: 3, length: 4 },
    });
    expect(await collect(complete.data)).toBe("0123456789");
    expect(complete.contentLength).toBe(10);
    expect(await collect(range.data)).toBe("3456");
    expect(range.contentLength).toBe(4);
  });

  test("returns an empty range beyond the end and rejects traversal", async () => {
    const directory = await mkdtemp(join(tmpdir(), "asset-read-"));
    directories.push(directory);
    await writeFile(join(directory, "post.md"), "body");
    const empty = await readFromFs({
      name: "post.md",
      fileDirectory: directory,
      range: { offset: 4, length: 1 },
    });
    expect(await collect(empty.data)).toBe("");
    expect(empty.contentLength).toBe(0);
    await expect(
      readFromFs({ name: "../outside.md", fileDirectory: directory })
    ).rejects.toThrow("outside the configured directory");
  });
});
