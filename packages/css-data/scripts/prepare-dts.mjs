import { copyFile, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const packageDir = dirname(dirname(fileURLToPath(import.meta.url)));
const repoRoot = resolve(packageDir, "../..");
const typesDir = resolve(packageDir, "lib/types");
const indexPath = resolve(typesDir, "index.d.ts");

await copyFile(
  resolve(repoRoot, "@types/css-tree.d.ts"),
  resolve(typesDir, "css-tree.d.ts")
);

const cssTreeImport = 'import type {} from "./css-tree";\n';
const indexContent = await readFile(indexPath, "utf8");

if (indexContent.startsWith(cssTreeImport) === false) {
  await writeFile(indexPath, `${cssTreeImport}${indexContent}`);
}
