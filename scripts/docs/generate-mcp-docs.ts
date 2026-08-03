import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const manualTitle = "# Webstudio MCP Manual";
const manualPlaceholder = "{{manual}}";
const versionPlaceholder = "{{version}}";
const repositoryRoot = fileURLToPath(new URL("../..", import.meta.url));
const outputPath = resolve(repositoryRoot, "docs/university/mcp.md");
const template = readFileSync(new URL("mcp-page.md", import.meta.url), "utf8");

const getCliVersion = () => {
  const packageJson = JSON.parse(
    readFileSync(resolve(repositoryRoot, "packages/cli/package.json"), "utf8")
  ) as { version?: unknown };
  if (typeof packageJson.version !== "string") {
    throw new Error("Expected the CLI package to have a version.");
  }
  return packageJson.version;
};

const getMcpManual = () =>
  execFileSync(
    process.execPath,
    [
      resolve(repositoryRoot, "packages/cli/local.js"),
      "man",
      "mcp",
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

export const renderMcpDocumentation = (manual: string, version: string) => {
  const normalizedManual = manual.replaceAll("\r\n", "\n").trim();
  if (normalizedManual.startsWith(`${manualTitle}\n`) === false) {
    throw new Error(
      `Expected the CLI manual to begin with ${JSON.stringify(manualTitle)}.`
    );
  }
  const manualBody = normalizedManual.slice(manualTitle.length).trimStart();
  const placeholderCount = template.split(manualPlaceholder).length - 1;
  if (placeholderCount !== 1) {
    throw new Error(
      `Expected one ${manualPlaceholder} placeholder, found ${placeholderCount}.`
    );
  }
  if (version.trim() === "") {
    throw new Error("Expected a CLI version.");
  }
  return template
    .replace(versionPlaceholder, version)
    .replace(manualPlaceholder, manualBody);
};

export const generateMcpDocumentation = () => {
  writeFileSync(
    outputPath,
    renderMcpDocumentation(getMcpManual(), getCliVersion()),
    "utf8"
  );
};

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  generateMcpDocumentation();
}
