/**
 * To run it go to the root: $ yarn tsx ./codemod/migrate-spacing.ts
 */
import fs from "fs/promises";
import path from "path";

const getRecursiveFileReads = async (dir: string) => {
  const results: any = [];
  const files = await fs.readdir(dir);
  for (const file of files) {
    const filePath = path.join(dir, file);
    const stat = await fs.stat(filePath);
    if (stat.isDirectory() && file !== "node_modules") {
      results.push(...(await getRecursiveFileReads(filePath)));
      continue;
    }

    if (path.extname(file) !== ".tsx" && path.extname(file) !== ".ts") {
      continue;
    }

    const buffer = await fs.readFile(filePath);

    results.push({
      filePath,
      buffer,
    });
  }
  return results;
};

const readDirectory = async (dir: string) => {
  const results = await getRecursiveFileReads(dir);
  console.log(results.length);
  return results;
};

const spaceProps = [
  "size",
  "sizes",
  "blockSize",
  "minBlockSize",
  "maxBlockSize",
  "inlineSize",
  "minInlineSize",
  "maxInlineSize",
  "width",
  "minWidth",
  "maxWidth",
  "height",
  "minHeight",
  "maxHeight",
  "flexBasis",
  "gridTemplateColumns",
  "gridTemplateRows",

  "gap",
  "gridGap",
  "columnGap",
  "gridColumnGap",
  "rowGap",
  "gridRowGap",
  "inset",
  "insetBlock",
  "insetBlockEnd",
  "insetBlockStart",
  "insetInline",
  "insetInlineEnd",
  "insetInlineStart",
  "margin",
  "marginTop",
  "marginRight",
  "marginBottom",
  "marginLeft",
  "marginBlock",
  "marginBlockEnd",
  "marginBlockStart",
  "marginInline",
  "marginInlineEnd",
  "marginInlineStart",
  "padding",
  "paddingTop",
  "paddingRight",
  "paddingBottom",
  "paddingLeft",
  "paddingBlock",
  "paddingBlockEnd",
  "paddingBlockStart",
  "paddingInline",
  "paddingInlineEnd",
  "paddingInlineStart",
  "top",
  "right",
  "bottom",
  "left",
  "scrollMargin",
  "scrollMarginTop",
  "scrollMarginRight",
  "scrollMarginBottom",
  "scrollMarginLeft",
  "scrollMarginX",
  "scrollMarginY",
  "scrollMarginBlock",
  "scrollMarginBlockEnd",
  "scrollMarginBlockStart",
  "scrollMarginInline",
  "scrollMarginInlineEnd",
  "scrollMarginInlineStart",
  "scrollPadding",
  "scrollPaddingTop",
  "scrollPaddingRight",
  "scrollPaddingBottom",
  "scrollPaddingLeft",
  "scrollPaddingX",
  "scrollPaddingY",
  "scrollPaddingBlock",
  "scrollPaddingBlockEnd",
  "scrollPaddingBlockStart",
  "scrollPaddingInline",
  "scrollPaddingInlineEnd",
  "scrollPaddingInlineStart",

  "mx",
  "my",
  "ml",
  "mb",
  "mr",
  "mt",
  "m",
  "px",
  "py",
  "pl",
  "pb",
  "pr",
  "pt",
  "p",
];

const spaceValues = new Map([
  ["$sizes$1", "3"],
  ["$sizes$2", "5"],
  ["$sizes$3", "9"],
  ["$sizes$4", "10"],
  ["$sizes$5", "11"],
  ["$sizes$6", "13"],
  ["$sizes$7", "17"],
  ["$sizes$8", "19"],
  ["$sizes$9", "20"],
  ["$space$1", "3"],
  ["$space$2", "5"],
  ["$space$3", "9"],
  ["$space$4", "10"],
  ["$space$5", "11"],
  ["$space$6", "13"],
  ["$space$7", "17"],
  ["$space$8", "19"],
  ["$space$9", "20"],
  ["$styleSection", "5"],
  ["$sidebarLeft", "16"],
  ["$sidebarRight", "30"],

  ["$1", "3"],
  ["$2", "5"],
  ["$3", "9"],
  ["$4", "10"],
  ["$5", "11"],
  ["$6", "13"],
  ["$7", "17"],
  ["$8", "19"],
  ["$9", "20"],

  ["1px", "1"],
  ["2px", "2"],
  ["3px", "2"],
  ["6px", "4"],
  ["7px", "4"],
  ["8px", "5"],
]);

const fontSizeProps = ["fontSize"];
const fontSizeValues = new Map([
  ["$1", "3"],
  ["$2", "3"],
  ["$3", "4"],
  ["$4", "4"],
  ["$5", "5"],
  ["$6", "6"],
  ["$7", "7"],
  ["$8", "8"],
  ["$9", "9"],
  ["14px", "4"],
]);

const lineHeightProps = ["lineHeight"];
const lineHeightValues = new Map([
  ["15px", "3"],
  ["16px", "3"],
  ["20px", "4"],
]);

const borderRadiusProps = ["borderRadius"];
const borderRadiusValues = new Map([
  ["$1", "4"],
  ["$2", "6"],
  ["$3", "7"],
  ["$round", "round"],
  ["$pill", "pill"],
]);

const updateProperty = (
  line: string,
  props: Array<string>,
  values: Map<string, string>,
  group: string
) => {
  for (const prop of props) {
    const regex = new RegExp(`${prop}: "(.+)"`, "g");
    const match = regex.exec(line);
    if (match && match[1]) {
      let value = match[1];
      for (const [key, nextValue] of values) {
        if (value.includes(key) === false) continue;
        // This is to allow the script to run multiple times
        value = value.replaceAll(`$${group}$`, `__${group}__`);

        value = value.replaceAll(key, `__${group}__${nextValue}`);
      }

      const next = `${prop}: "${value}"`;
      line = line.replace(regex, next);
    }
  }
  line = line.replaceAll(`__${group}__`, `$${group}$`);
  return line;
};

const update = async ({ filePath, buffer }) => {
  let code = buffer.toString("utf-8");
  const lines = code.split("\n");
  const nextLines: Array<string> = [];
  let line: string = "";
  for (line of lines) {
    line = updateProperty(line, spaceProps, spaceValues, "spacing");
    line = updateProperty(line, fontSizeProps, fontSizeValues, "fontSize");
    line = updateProperty(
      line,
      lineHeightProps,
      lineHeightValues,
      "lineHeight"
    );
    line = updateProperty(
      line,
      borderRadiusProps,
      borderRadiusValues,
      "borderRadius"
    );
    nextLines.push(line);
  }
  await fs.writeFile(filePath, nextLines.join("\n"));
};

const main = async () => {
  const src = path.resolve(__dirname, "..");
  const files = await readDirectory(src);
  files.forEach(update);
};

main();
