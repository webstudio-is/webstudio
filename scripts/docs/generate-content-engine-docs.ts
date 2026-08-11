import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const manualTitle = "# Content Engine reference";
const referencePlaceholder = "{{reference}}";
const repositoryRoot = fileURLToPath(new URL("../..", import.meta.url));
const outputPath = fileURLToPath(
  new URL(
    "../../docs/university/foundations/content-engine-reference.md",
    import.meta.url
  )
);
const template = readFileSync(
  new URL("content-engine-reference-page.md", import.meta.url),
  "utf8"
);

const getContentEngineManual = () =>
  execFileSync(
    process.execPath,
    [
      resolve(repositoryRoot, "packages/cli/local.js"),
      "man",
      "content-engine",
      "--verbose",
    ],
    {
      encoding: "utf8",
      cwd: repositoryRoot,
      env: {
        ...process.env,
        CI: "1",
        FORCE_COLOR: "0",
        NO_COLOR: "1",
      },
      maxBuffer: 10 * 1024 * 1024,
    }
  ).trim();

export const renderContentEngineDocumentation = (manual: string) => {
  const placeholderCount = template.split(referencePlaceholder).length - 1;
  if (placeholderCount !== 1) {
    throw new Error(
      `Expected one ${referencePlaceholder} placeholder, found ${placeholderCount}.`
    );
  }
  const normalizedManual = manual.replaceAll("\r\n", "\n").trim();
  if (normalizedManual.startsWith(`${manualTitle}\n`) === false) {
    throw new Error(
      `Expected the CLI manual to begin with ${JSON.stringify(manualTitle)}.`
    );
  }
  return template.replace(referencePlaceholder, normalizedManual);
};

export const generateContentEngineDocumentation = () => {
  writeFileSync(
    outputPath,
    renderContentEngineDocumentation(getContentEngineManual()),
    "utf8"
  );
};

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  generateContentEngineDocumentation();
}
