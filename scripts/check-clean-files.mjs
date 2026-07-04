import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const paths = process.argv.slice(2);

if (paths.length === 0) {
  console.error("Usage: node scripts/check-clean-files.mjs <path> [...path]");
  process.exit(1);
}

const { stdout } = await execFileAsync("git", [
  "status",
  "--porcelain",
  "--",
  ...paths,
]);

const changes = stdout.trim();

if (changes.length > 0) {
  console.error("Generated files are out of date or untracked:\n");
  console.error(changes);
  process.exit(1);
}

console.info("Generated files are clean.");
