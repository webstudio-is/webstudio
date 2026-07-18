import { mkdtemp, readFile, rm, writeFile, mkdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, test } from "vitest";
import { build } from "esbuild";

const temporaryDirectories: string[] = [];

afterEach(async () => {
  await Promise.all(
    temporaryDirectories
      .splice(0)
      .map((directory) => rm(directory, { recursive: true, force: true }))
  );
});

describe("generated Worker asset boundary", () => {
  test("keeps Markdown bodies and resource indexes outside JavaScript", async () => {
    const root = await mkdtemp(join(tmpdir(), "webstudio-asset-resource-"));
    temporaryDirectories.push(root);

    const publicDirectory = join(root, "public");
    const indexDirectory = join(publicDirectory, "resource-indexes");
    const assetDirectory = join(publicDirectory, "assets");
    await Promise.all([
      mkdir(indexDirectory, { recursive: true }),
      mkdir(assetDirectory, { recursive: true }),
    ]);

    const indexMarker = "INDEX_BYTES_MUST_NOT_ENTER_WORKER_7f15c";
    const markdownMarker = "MARKDOWN_BYTES_MUST_NOT_ENTER_WORKER_4a20d";
    const indexPath = join(indexDirectory, "blog.index-revision-7.json");
    const markdownPath = join(assetDirectory, "hello-world.md");
    await Promise.all([
      writeFile(
        indexPath,
        JSON.stringify({
          format: "webstudio-resource-index",
          version: 1,
          marker: indexMarker,
        })
      ),
      writeFile(markdownPath, `---\ntitle: Hello\n---\n${markdownMarker}`),
    ]);

    const result = await build({
      stdin: {
        contents: `
          const indexUrl = "/resource-indexes/blog.index-revision-7.json";
          const contentUrl = "/assets/hello-world.md";
          export default {
            async fetch(request, env) {
              const index = await env.ASSETS.fetch(new URL(indexUrl, request.url));
              if (new URL(request.url).pathname === "/post") {
                return env.ASSETS.fetch(new URL(contentUrl, request.url));
              }
              return index;
            }
          };
        `,
        resolveDir: root,
        sourcefile: "worker.ts",
      },
      bundle: true,
      format: "esm",
      minify: true,
      platform: "browser",
      target: "es2022",
      write: false,
    });
    const workerBundle = result.outputFiles[0].text;

    expect(workerBundle).toContain(
      "/resource-indexes/blog.index-revision-7.json"
    );
    expect(workerBundle).toContain("/assets/hello-world.md");
    expect(workerBundle).not.toContain(indexMarker);
    expect(workerBundle).not.toContain(markdownMarker);
    await expect(readFile(indexPath, "utf8")).resolves.toContain(indexMarker);
    await expect(readFile(markdownPath, "utf8")).resolves.toContain(
      markdownMarker
    );
  });
});
