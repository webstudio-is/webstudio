import { afterEach, beforeEach, expect, test } from "vitest";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import {
  managedAgentsHeader,
  materializeManagedAgents,
} from "./managed-agents";

let rootDir: string;

beforeEach(async () => {
  rootDir = await mkdtemp(join(tmpdir(), "webstudio-agents-"));
});

afterEach(async () => {
  await rm(rootDir, { recursive: true, force: true });
});

test("creates, updates, and removes the managed AGENTS.md", async () => {
  await expect(
    materializeManagedAgents({ rootDir, instructions: "Use tokens." })
  ).resolves.toMatchObject({ status: "created" });
  expect(await readFile(join(rootDir, "AGENTS.md"), "utf8")).toBe(
    `${managedAgentsHeader}\n\nUse tokens.\n`
  );

  await expect(
    materializeManagedAgents({ rootDir, instructions: "Use components." })
  ).resolves.toMatchObject({ status: "updated" });
  await expect(
    materializeManagedAgents({ rootDir, instructions: "Use components." })
  ).resolves.toMatchObject({ status: "unchanged" });
  await expect(
    materializeManagedAgents({ rootDir, instructions: "" })
  ).resolves.toMatchObject({ status: "removed" });
});

test("never overwrites or removes a user-owned AGENTS.md", async () => {
  const path = join(rootDir, "AGENTS.md");
  await writeFile(path, "# User instructions\n", "utf8");

  await expect(
    materializeManagedAgents({ rootDir, instructions: "Use tokens." })
  ).resolves.toMatchObject({ status: "blocked-by-user-file", path });
  await expect(
    materializeManagedAgents({ rootDir, instructions: "" })
  ).resolves.toMatchObject({ status: "unchanged", path });
  expect(await readFile(path, "utf8")).toBe("# User instructions\n");
});
