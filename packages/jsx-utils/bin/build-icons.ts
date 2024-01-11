import fg from "fast-glob";
import * as fs from "node:fs";
import * as path from "node:path";

const GENERATED_FILES_DIR = "__generated__";

const iconFiles = fg.sync("**/heroicons/**/**.svg");

if (iconFiles.length === 0) {
  throw new Error("No icons files found");
}

type Icons = { [name in string]: string };
const icons = iconFiles.reduce(
  (icons, filePath) => {
    const name = path.basename(filePath, ".svg");

    const typeFromPath = path.dirname(filePath).split("/").pop();
    const type =
      typeFromPath !== "solid" && typeFromPath !== "outline"
        ? "solid"
        : typeFromPath;

    const icon = fs.readFileSync(filePath, "utf-8");

    if (typeof icons === "object" && type in icons === false) {
      icons[type] = {};
    }

    icons[type][name] = icon.replace("<svg", '<svg style="height: 1.1em;"');

    return icons;
  },
  {} as { solid: Icons; outline: Icons }
);

const baseDir = path.dirname(iconFiles[0]).split("/").slice(0, -1).join("/");

const generatedDir = path.join(baseDir, GENERATED_FILES_DIR);
fs.mkdirSync(generatedDir, { recursive: true });

fs.writeFileSync(
  path.join(generatedDir, "heroicons.ts"),
  `/* this file is generated */\nexport const heroicons = ${JSON.stringify(
    icons
  )};\n`
);
