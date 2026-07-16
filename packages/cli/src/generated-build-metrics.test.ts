import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, expect, test } from "vitest";
import { inspectGeneratedBuildMetrics } from "./generated-build-metrics";

const directories: string[] = [];

afterEach(async () => {
  await Promise.all(
    directories.splice(0).map((path) => rm(path, { recursive: true }))
  );
});

test("returns bounded privacy-safe generated build metrics", async () => {
  const directory = await mkdtemp(join(tmpdir(), "webstudio-build-metrics-"));
  directories.push(directory);
  await mkdir(join(directory, "build/client/assets"), { recursive: true });
  await mkdir(join(directory, "build/server"), { recursive: true });
  await writeFile(
    join(directory, "build/client/assets/index.js"),
    "export const value = 1;".repeat(100)
  );
  await writeFile(
    join(directory, "build/client/assets/hero.webp"),
    Buffer.alloc(512)
  );
  await writeFile(
    join(directory, "build/server/index.js"),
    "server".repeat(50)
  );

  const metrics = await inspectGeneratedBuildMetrics(directory);

  expect(metrics).toMatchObject({
    version: 1,
    fileCount: 3,
    client: { fileCount: 2 },
    server: { fileCount: 1 },
    largestFiles: expect.arrayContaining([
      expect.objectContaining({
        path: "client/assets/index.js",
        kind: "script",
      }),
      expect.objectContaining({
        path: "client/assets/hero.webp",
        kind: "image",
      }),
    ]),
  });
  expect(metrics.gzipBytes).toBeLessThan(metrics.bytes);
  expect(JSON.stringify(metrics)).not.toContain(directory);
  expect(metrics.largestFiles).toHaveLength(3);
});

test("returns empty metrics when no generated build exists", async () => {
  const directory = await mkdtemp(join(tmpdir(), "webstudio-build-metrics-"));
  directories.push(directory);

  await expect(inspectGeneratedBuildMetrics(directory)).resolves.toEqual({
    version: 1,
    fileCount: 0,
    bytes: 0,
    gzipBytes: 0,
    client: { fileCount: 0, bytes: 0, gzipBytes: 0 },
    server: { fileCount: 0, bytes: 0, gzipBytes: 0 },
    largestFiles: [],
  });
});
