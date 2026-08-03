import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const manualTitle = "# Webstudio MCP Manual";
const manualPlaceholder = "{{manual}}";
const npmCommand = process.platform === "win32" ? "npm.cmd" : "npm";
const pnpmCommand = process.platform === "win32" ? "pnpm.cmd" : "pnpm";
const versionPlaceholder = "{{version}}";
const repositoryRoot = fileURLToPath(new URL("../..", import.meta.url));
const outputPath = resolve(repositoryRoot, "docs/university/mcp.md");
const template = readFileSync(new URL("mcp-page.md", import.meta.url), "utf8");

const run = (command: string, args: string[]) =>
  execFileSync(command, args, {
    encoding: "utf8",
    env: {
      ...process.env,
      CI: "1",
      FORCE_COLOR: "0",
      NO_COLOR: "1",
    },
    maxBuffer: 10 * 1024 * 1024,
  }).trim();

const getLatestCliVersion = () =>
  run(npmCommand, ["view", "webstudio@latest", "version"]);

const getMcpManual = (version: string) =>
  run(pnpmCommand, ["dlx", `webstudio@${version}`, "man", "mcp", "--verbose"]);

const replacePlaceholder = ({
  contents,
  expectedCount,
  placeholder,
  value,
}: {
  contents: string;
  expectedCount: number;
  placeholder: string;
  value: string;
}) => {
  const count = contents.split(placeholder).length - 1;
  if (count !== expectedCount) {
    throw new Error(
      `Expected ${expectedCount} ${placeholder} placeholder${expectedCount === 1 ? "" : "s"}, found ${count}.`
    );
  }
  return contents.replaceAll(placeholder, value);
};

export const renderMcpDocumentation = ({
  manual,
  version,
}: {
  manual: string;
  version: string;
}) => {
  const normalizedManual = manual.replaceAll("\r\n", "\n").trim();
  if (normalizedManual.startsWith(`${manualTitle}\n`) === false) {
    throw new Error(
      `Expected the CLI manual to begin with ${JSON.stringify(manualTitle)}.`
    );
  }
  const manualBody = normalizedManual.slice(manualTitle.length).trimStart();
  const versionedTemplate = replacePlaceholder({
    contents: template,
    expectedCount: 2,
    placeholder: versionPlaceholder,
    value: version,
  });
  return replacePlaceholder({
    contents: versionedTemplate,
    expectedCount: 1,
    placeholder: manualPlaceholder,
    value: manualBody,
  });
};

export const generateMcpDocumentation = (version = getLatestCliVersion()) => {
  const manual = getMcpManual(version);
  writeFileSync(
    outputPath,
    renderMcpDocumentation({ manual, version }),
    "utf8"
  );
  return version;
};

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  process.stdout.write(`${generateMcpDocumentation(process.argv[2])}\n`);
}
