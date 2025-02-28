import { mkdir, readFile, writeFile } from "node:fs/promises";
import htmlTags from "html-tags";
import { parseCss } from "@webstudio-is/css-data";

const mapGroupBy = <Item, Key>(
  array: Item[] | Iterable<Item>,
  getKey: (item: Item) => Key
) => {
  const groups = new Map<Key, Item[]>();
  for (const item of array) {
    const key = getKey(item);
    let group = groups.get(key);
    if (group === undefined) {
      group = [];
      groups.set(key, group);
    }
    group.push(item);
  }
  return groups;
};

const css = await readFile("./src/normalize.css", "utf8");
const parsed = parseCss(css);
const groups = mapGroupBy(parsed, (styleDecl) => styleDecl.selector);

const validTags = [
  ...htmlTags,
  // exceptions to access preset styles in Checkbox and Radio components
  "checkbox",
  "radio",
];

const cache = new Map<string, string>();

let code = "";
code += `import type { CssProperty, StyleValue } from "@webstudio-is/css-engine";\n`;
code += `
type StyleDecl = {
  state?: string;
  property: CssProperty;
  value: StyleValue;
}

`;
for (const [tag, styles] of groups) {
  if (validTags.includes(tag) === false) {
    throw Error(`Unexpected tag "${tag}"`);
  }
  const newStyles = styles.map(({ state, property, value }) => ({
    state,
    property,
    value,
  }));
  let serializedStyles = JSON.stringify(newStyles);
  const cachedTag = cache.get(serializedStyles);
  // to prevent duplicating same styles
  // assign already rendered tag to the tag with same styles
  if (cachedTag) {
    serializedStyles = cachedTag;
    code += `export const ${tag} = ${cachedTag};\n\n`;
  } else {
    cache.set(serializedStyles, tag);
    code += `export const ${tag}: StyleDecl[] = ${serializedStyles};\n\n`;
  }
}

await mkdir("./src/__generated__", { recursive: true });
await writeFile("./src/__generated__/normalize.css.ts", code);
