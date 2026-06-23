import { afterEach, beforeEach, expect, test } from "vitest";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { loadJSONFile } from "./fs-utils";

const originalCwd = process.cwd();
let tempDir: string;

beforeEach(async () => {
  tempDir = await mkdtemp(join(tmpdir(), "webstudio-fs-utils-"));
  process.chdir(tempDir);
});

afterEach(async () => {
  process.chdir(originalCwd);
  await rm(tempDir, { recursive: true, force: true });
});

test("returns null for missing JSON file", async () => {
  await expect(loadJSONFile("missing.json")).resolves.toBeNull();
});

test("loads JSON file content", async () => {
  await writeFile("data.json", JSON.stringify({ value: 1 }), "utf8");

  await expect(loadJSONFile("data.json")).resolves.toEqual({ value: 1 });
});

test("throws for malformed JSON file", async () => {
  await writeFile("data.json", "{", "utf8");

  await expect(loadJSONFile("data.json")).rejects.toThrow();
});
