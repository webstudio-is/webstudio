import { readdir, readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, test } from "vitest";

const currentDirectory = dirname(fileURLToPath(import.meta.url));
const sourceDirectory = join(currentDirectory, "..");
const checkedDirectories = [
  join(sourceDirectory, "contracts"),
  join(sourceDirectory, "runtime"),
  join(sourceDirectory, "state"),
];
const checkedFiles = [join(sourceDirectory, "project-session.ts")];

const forbiddenImports = [
  "@webstudio-is/protocol",
  "@webstudio-is/http-client",
  "@webstudio-is/authorization-token",
  'from "@webstudio-is/project"',
  "from '@webstudio-is/project'",
  'from "@webstudio-is/project/',
  "from '@webstudio-is/project/",
  "@webstudio-is/domain",
  "apps/builder",
  "/app/",
  "../db/",
  "../index.server",
  "deployment",
];

const readTypeScriptFiles = async (directory: string): Promise<string[]> => {
  const entries = await readdir(directory, { withFileTypes: true });
  const files: string[] = [];

  for (const entry of entries) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await readTypeScriptFiles(path)));
      continue;
    }
    if (
      entry.name.endsWith(".ts") &&
      entry.name.endsWith(".test.ts") === false
    ) {
      files.push(path);
    }
  }

  return files;
};

describe("project-build state entry point boundaries", () => {
  test("does not import transport, builder app, db, auth, or deployment code", async () => {
    const files = (
      await Promise.all(checkedDirectories.map(readTypeScriptFiles))
    )
      .flat()
      .concat(checkedFiles);

    for (const file of files) {
      const source = await readFile(file, "utf8");
      for (const forbiddenImport of forbiddenImports) {
        expect(source, `${file} imports ${forbiddenImport}`).not.toContain(
          forbiddenImport
        );
      }
    }
  });
});
