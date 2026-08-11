import { execFile as execFileCallback } from "node:child_process";
import {
  mkdtemp,
  mkdir,
  readFile,
  realpath,
  rm,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import { expect, test } from "vitest";

const execFile = promisify(execFileCallback);

test("provides a generated-preview fallback package entry", async () => {
  const directory = await mkdtemp(join(tmpdir(), "webstudio-router-package-"));
  const packageDirectory = join(
    directory,
    "node_modules",
    "@webstudio-is",
    "sdk-components-react-router"
  );
  await mkdir(join(packageDirectory, "lib"), { recursive: true });
  await writeFile(
    join(packageDirectory, "package.json"),
    await readFile(new URL("../package.json", import.meta.url), "utf8")
  );
  await writeFile(join(packageDirectory, "lib", "components.js"), "");

  try {
    const { stdout } = await execFile(
      process.execPath,
      ["-p", 'require.resolve("@webstudio-is/sdk-components-react-router")'],
      {
        cwd: directory,
        env: { ...process.env, NODE_OPTIONS: "" },
      }
    );
    expect(await realpath(stdout.trim())).toBe(
      await realpath(join(packageDirectory, "lib", "components.js"))
    );
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
