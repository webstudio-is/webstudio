import fg from "fast-glob";
import * as fs from "node:fs";
import * as path from "node:path";

const GENERATED_FILES_DIR = "__generated__";
const [globs] = process.argv.slice(2);

if (!globs || !globs.trim()) {
  throw new Error(
    "Please provide glob patterns (space separated) as arguments to match your prompts"
  );
}

const prompts = fg.sync(globs);

if (prompts.length === 0) {
  throw new Error("No prompt files found");
}

prompts.forEach((filePath) => {
  const generatedDir = path.join(path.dirname(filePath), GENERATED_FILES_DIR);

  fs.mkdirSync(generatedDir, { recursive: true });

  const generatedFile = `${path.basename(filePath, ".md")}.ts`;
  const generatedPath = path.join(generatedDir, generatedFile);

  const content = fs
    .readFileSync(filePath, "utf-8")
    .replace(/`/g, "\\`")
    .replace(/\$/g, "\\$"); // @todo technically we should escape only the $ that belong to template literals.;

  fs.writeFileSync(generatedPath, `export const prompt = \`${content}\`;\n`);

  console.info(`Done generating argTypes for ${generatedPath}`);
});
