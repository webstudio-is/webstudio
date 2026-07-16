import { readFile, readdir } from "node:fs/promises";
import { join, relative } from "node:path";
import type { EvaluationArtifact } from "./validate";

const byName = (left: { name: string }, right: { name: string }) =>
  left.name.localeCompare(right.name);

const collectScreenshots = async (directory: string) => {
  const artifacts: EvaluationArtifact[] = [];
  const visit = async (path: string) => {
    for (const entry of (await readdir(path, { withFileTypes: true })).sort(
      byName
    )) {
      if (entry.name === ".webstudio") {
        continue;
      }
      const entryPath = join(path, entry.name);
      if (entry.isDirectory()) {
        await visit(entryPath);
        continue;
      }
      if (entry.name.endsWith(".png") === false) {
        continue;
      }
      const source = await readFile(entryPath);
      if (
        source.length >= 24 &&
        source
          .subarray(0, 8)
          .equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))
      ) {
        artifacts.push({
          kind: "screenshot",
          path: relative(directory, entryPath),
          viewport: {
            width: source.readUInt32BE(16),
            height: source.readUInt32BE(20),
          },
          passed: true,
        });
      }
    }
  };
  await visit(directory);
  return artifacts;
};

const collectRenderedAudits = async (directory: string) => {
  const auditDirectory = join(directory, ".webstudio", "audits");
  const entries = await readdir(auditDirectory, { withFileTypes: true }).catch(
    () => []
  );
  return await Promise.all(
    entries
      .filter(
        (entry) =>
          entry.isFile() &&
          entry.name.startsWith("rendered-") &&
          entry.name.endsWith(".json")
      )
      .sort(byName)
      .map(async (entry): Promise<EvaluationArtifact> => {
        const path = join(auditDirectory, entry.name);
        let manifest: unknown;
        try {
          manifest = JSON.parse(await readFile(path, "utf8"));
        } catch {
          return {
            kind: "audit",
            path: relative(directory, path),
            passed: false,
          };
        }
        const value = manifest as { checks?: unknown; failures?: unknown };
        return {
          kind: "audit",
          path: relative(directory, path),
          passed:
            Array.isArray(value.checks) &&
            value.checks.length > 0 &&
            Array.isArray(value.failures) &&
            value.failures.length === 0,
        };
      })
  );
};

export const collectHighImpactArtifacts = async (directory: string) => [
  ...(await collectScreenshots(directory)),
  ...(await collectRenderedAudits(directory)),
];
