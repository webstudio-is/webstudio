import { expect, test } from "vitest";
import { preview, previewOptions } from "./preview";
import type { CommonYargsArgv } from "./yargs-types";

test("rejects empty preview host", async () => {
  await expect(
    preview({
      host: "",
      port: 5173,
      generate: false,
      assets: true,
      template: ["ssg"],
    })
  ).rejects.toThrow("--host must not be empty.");
});

test("documents generated app dependency setup", () => {
  const yargs = {
    option: () => yargs,
    example: () => yargs,
    epilogue: (text: string) => {
      epilogueText = text;
      return yargs;
    },
  } as unknown as CommonYargsArgv;
  let epilogueText = "";

  previewOptions(yargs);

  expect(epilogueText).toContain("does not install app dependencies");
  expect(epilogueText).toContain("npm install or pnpm install");
  expect(epilogueText).toContain("react-router or vite");
});
