import { afterEach, beforeEach, expect, test } from "vitest";
import {
  copyFile,
  mkdir,
  mkdtemp,
  readFile,
  rm,
  writeFile,
} from "node:fs/promises";
import { dirname, join } from "node:path";
import { tmpdir } from "node:os";
import { GLOBAL_CONFIG_FILE, LOCAL_CONFIG_FILE } from "../config";
import { parseShareLink, saveShareLink, validateShareLink } from "./link";

const originalCwd = process.cwd();
const projectId = "11111111-1111-4111-8111-111111111111";
const shareLink = `https://p-${projectId}-dot-example.com/?authToken=token-1`;
let tempDir: string;
let backupPath: string;

beforeEach(async () => {
  tempDir = await mkdtemp(join(tmpdir(), "webstudio-link-"));
  backupPath = join(tempDir, "global-config-backup.json");
  process.chdir(tempDir);
  await mkdir(dirname(GLOBAL_CONFIG_FILE), { recursive: true });
  try {
    await copyFile(GLOBAL_CONFIG_FILE, backupPath);
  } catch {
    await rm(backupPath, { force: true });
  }
  await writeFile(GLOBAL_CONFIG_FILE, "{}", "utf8");
});

afterEach(async () => {
  process.chdir(originalCwd);
  try {
    await copyFile(backupPath, GLOBAL_CONFIG_FILE);
  } catch {
    await rm(GLOBAL_CONFIG_FILE, { force: true });
  }
  await rm(tempDir, { recursive: true, force: true });
});

test("parses and validates share links", () => {
  expect(parseShareLink(shareLink)).toEqual({
    origin: "https://example.com",
    projectId,
    token: "token-1",
  });

  expect(validateShareLink("")).toBe("Share link is required");
  expect(validateShareLink("not-a-url")).toBe("Share link is invalid");
  expect(validateShareLink(shareLink)).toBeUndefined();
});

test("saves global credentials and local project config", async () => {
  await expect(saveShareLink(shareLink)).resolves.toEqual({
    origin: "https://example.com",
    projectId,
  });

  expect(JSON.parse(await readFile(GLOBAL_CONFIG_FILE, "utf8"))).toEqual({
    [projectId]: {
      origin: "https://example.com",
      token: "token-1",
    },
  });
  expect(JSON.parse(await readFile(LOCAL_CONFIG_FILE, "utf8"))).toEqual({
    projectId,
  });
});
