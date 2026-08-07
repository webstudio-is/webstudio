import { spawnSync } from "node:child_process";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { test } from "vitest";
import { bundleSanitizeHtml } from "../scripts/bundle-sanitize-html-utils";

test("loads the bundled sanitizer without require(ESM) support", async () => {
  const outputDirectory = await mkdtemp(
    path.join(tmpdir(), "webstudio-sanitize-html-")
  );
  const outfile = path.join(outputDirectory, "sanitize-html.mjs");

  try {
    await bundleSanitizeHtml({ outfile });
    const nodeArgs = process.features.require_module
      ? ["--no-experimental-require-module"]
      : [];
    const result = spawnSync(process.execPath, [...nodeArgs, outfile], {
      encoding: "utf8",
    });

    if (result.status !== 0) {
      throw new Error(result.stderr);
    }
  } finally {
    await rm(outputDirectory, { recursive: true, force: true });
  }
});
