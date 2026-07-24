import { chmod, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { expect, test } from "vitest";
import { cliExecute } from "./prisma-command";

test("rejects when Prisma cannot execute a migration", async () => {
  const directory = await mkdtemp(path.join(tmpdir(), "prisma-command-"));
  const executable = path.join(directory, "prisma");
  const originalPath = process.env.PATH;

  try {
    await writeFile(executable, "#!/bin/sh\nexit 23\n");
    await chmod(executable, 0o755);
    process.env.PATH = `${directory}${path.delimiter}${originalPath ?? ""}`;

    await expect(cliExecute("unused.sql")).rejects.toMatchObject({
      exitCode: 23,
    });
  } finally {
    process.env.PATH = originalPath;
    await rm(directory, { recursive: true });
  }
});
