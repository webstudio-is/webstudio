import fg from "fast-glob";
import * as fs from "node:fs";
import * as path from "node:path";

const GENERATED_FILES_DIR = "__generated__";

const iconFiles = fg.sync("**/heroicons/**/**.svg");

if (iconFiles.length === 0) {
  throw new Error("No icons files found");
}

const icons = iconFiles.reduce((icons, filePath) => {
  const name = path.basename(filePath, ".svg");

  const type = path.dirname(filePath).split("/").pop() || "solid";
  const icon = fs.readFileSync(filePath, "utf-8");

  if (typeof icons === "object" && type in icons === false) {
    icons[type] = {};
  }

  icons[type][name] = icon.replace("<svg", '<svg style="height: 1.1em;"');

  return icons;
}, {});

const baseDir = path.dirname(iconFiles[0]).split("/").slice(0, -1).join("/");

const generatedDir = path.join(baseDir, GENERATED_FILES_DIR);
fs.mkdirSync(generatedDir, { recursive: true });

fs.writeFileSync(
  path.join(generatedDir, "heroicons.ts"),
  `export const heroicons = ${JSON.stringify(icons)};\n`
);
