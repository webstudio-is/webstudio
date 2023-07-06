import fg from "fast-glob";
import fs from "fs-extra";
import * as path from "path";

const GENERATED_FILES_DIR = "__generated__";
const globs = process.argv.pop();

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

  if (!fs.existsSync(generatedDir)) {
    fs.mkdirSync(generatedDir, { recursive: true });
  }

  const generatedFile = `${path.basename(filePath, ".md")}.ts`;
  const generatedPath = path.join(generatedDir, generatedFile);

  fs.ensureFileSync(generatedPath);

  const content = fs.readFileSync(filePath, "utf-8").replace(/`/g, "\\`");

  fs.writeFileSync(generatedPath, `export const prompt = \`${content}\`;\n`);
  console.log(`Done generating argTypes for ${generatedPath}`);
});
