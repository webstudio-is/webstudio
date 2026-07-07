import { readFile, readdir } from "node:fs/promises";
import { join } from "node:path";
import { expect, test } from "vitest";

const commandsDir = new URL(".", import.meta.url);

const readCommandFiles = async () => {
  const names = await readdir(commandsDir);
  const files = await Promise.all(
    names
      .filter((name) => name.endsWith(".ts"))
      .filter((name) => name !== "api-guardrails.test.ts")
      .map(async (name) => ({
        name,
        content: await readFile(join(commandsDir.pathname, name), "utf-8"),
      }))
  );
  return files;
};

test("api cli command layer does not import low-level trpc clients", async () => {
  const files = await readCommandFiles();
  for (const file of files) {
    expect(file.content, file.name).not.toMatch(/@trpc\/client|httpBatchLink/);
  }
});

test("api cli command tests do not mock modules", async () => {
  const files = await readCommandFiles();
  for (const file of files) {
    expect(file.content, file.name).not.toMatch(
      /\bvi\.mock\(|\bjest\.mock\(|unstable_mockModule|mockModule/
    );
  }
});

test("api command execution does not construct builder patch payloads", async () => {
  const content = await readFile(
    join(commandsDir.pathname, "api-command.ts"),
    "utf-8"
  );
  expect(content).not.toMatch(/\bnamespace:\s*["']/);
  expect(content).not.toMatch(/\bpatches:\s*\[/);
});
