import { writeFile, mkdir } from "node:fs/promises";
// Imported theme https://github.com/tailwindlabs/tailwindcss/blob/e0c52a9332a64ef7eb0ba23d2a0fd5a16fe57ab7/stubs/config.full.js
// eslint-disable-next-line import/no-internal-modules
import defaultTheme from "tailwindcss/defaultTheme";
import type { StyleValue, StyleProperty } from "@webstudio-is/css-engine";
import { parseCssValue, parseShadow } from "@webstudio-is/css-data";
import type { ResolvableTo } from "tailwindcss/types/config";
import { colors as colorOverrides } from "../src/theme/tailwind-colors";

const theme = {
  ...defaultTheme,
  colors: colorOverrides,
  borderRadius: {
    ...defaultTheme.borderRadius,
    DEFAULT: "0.5rem",
  },
};

type GeneratedThemeItem = {
  name: string;
  extends?: string;
  values: Record<string, StyleValue>;
};

// preparse each object value to avoid loading csstree in cli
const parsePropertyValues = (
  property: StyleProperty,
  values: ResolvableTo<Record<string, string>> | Record<string, string>
) => {
  return Object.fromEntries(
    Object.entries(values).map(([name, value]) => [
      name,
      parseCssValue(property, value),
    ])
  );
};

// some theme fields are functions returning values
// usually to reuse other values like spacing in margin
const invokeResolvable = (
  values?: ResolvableTo<Record<string, string>> | Record<string, string>
) => {
  if (typeof values === "function") {
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore stub empty because no need to return anything
    return values({ theme: () => {}, breakpoints: () => ({}) });
  }
  return values;
};

const generatedThemeData: GeneratedThemeItem[] = [
  {
    name: "spacing",
    values: parsePropertyValues("paddingLeft", theme.spacing),
  },
  {
    name: "padding",
    extends: "spacing",
    values: {},
  },
  {
    name: "margin",
    extends: "spacing",
    values: parsePropertyValues("marginLeft", {
      ...invokeResolvable(theme.margin),
    }),
  },
  {
    name: "width",
    extends: "spacing",
    values: parsePropertyValues("width", {
      ...invokeResolvable(theme.width),
    }),
  },
  {
    name: "maxWidth",
    values: parsePropertyValues("maxWidth", {
      ...invokeResolvable(theme.maxWidth),
    }),
  },
  {
    name: "height",
    extends: "spacing",
    values: parsePropertyValues("height", {
      ...invokeResolvable(theme.height),
    }),
  },
  {
    name: "minHeight",
    values: parsePropertyValues("minHeight", {
      ...invokeResolvable(theme.minHeight),
    }),
  },
  {
    name: "inset",
    extends: "spacing",
    values: parsePropertyValues("top", {
      ...invokeResolvable(theme.inset),
    }),
  },
  {
    name: "borderWidth",
    values: parsePropertyValues("borderTopWidth", theme.borderWidth),
  },
  {
    name: "borderRadius",
    values: parsePropertyValues("borderStartStartRadius", theme.borderRadius),
  },
  {
    name: "colors",
    values: parsePropertyValues("color", theme.colors),
  },
  {
    name: "zIndex",
    values: parsePropertyValues("zIndex", theme.zIndex),
  },
  {
    name: "opacity",
    values: parsePropertyValues("opacity", theme.opacity),
  },
  {
    name: "cursor",
    values: parsePropertyValues("cursor", theme.cursor),
  },
  {
    name: "lineHeight",
    values: parsePropertyValues("lineHeight", theme.lineHeight),
  },
  {
    name: "letterSpacing",
    values: parsePropertyValues("letterSpacing", theme.letterSpacing),
  },
  {
    name: "listStyleType",
    values: parsePropertyValues("listStyleType", theme.listStyleType),
  },
  {
    name: "lineClamp",
    values: parsePropertyValues("lineClamp", theme.lineClamp),
  },
  {
    name: "textUnderlineOffset",
    values: parsePropertyValues(
      "textUnderlineOffset",
      theme.textUnderlineOffset
    ),
  },
  {
    name: "ringWidth",
    values: parsePropertyValues("width", theme.ringWidth),
  },
  {
    name: "ringOffsetWidth",
    values: parsePropertyValues("width", theme.ringOffsetWidth),
  },
  {
    name: "boxShadow",
    // there is a special parser for shadow
    values: Object.fromEntries(
      Object.entries(theme.boxShadow).map(([name, value]) => [
        name,
        parseShadow("boxShadow", value),
      ])
    ),
  },
  {
    name: "blur",
    values: Object.fromEntries(
      Object.entries(theme.boxShadow).map(([name, value]) => [
        name,
        // original blur theme provides pixel values
        // though they need to be represented as style value
        // so wrap with blur() and convert to unparsed
        { type: "unparsed", value: `blur(${value})` },
      ])
    ),
  },
  // fontSize use complex tuple to describe multiple values
  // here replace with 2 theme values instead
  {
    name: "fontSize",
    values: Object.fromEntries(
      Object.entries(theme.fontSize).map(([name, [fontSize]]) => [
        name,
        parseCssValue("fontSize", fontSize),
      ])
    ),
  },
  {
    name: "fontSizeLineHeight",
    values: Object.fromEntries(
      Object.entries(theme.fontSize).map(
        ([name, [_fontSize, { lineHeight }]]) => [
          name,
          parseCssValue("lineHeight", lineHeight),
        ]
      )
    ),
  },
];

let generatedTheme = "";
generatedTheme += `import type { StyleValue } from '@webstudio-is/css-engine';\n\n`;
for (const item of generatedThemeData) {
  const enumItems = Object.keys(item.values).map((key) => JSON.stringify(key));
  let jsonString = JSON.stringify(item.values);
  // extend both record keys and runtime values
  if (item.extends) {
    enumItems.unshift(`keyof typeof ${item.extends}`);
    jsonString = `{\n  ...${item.extends},\n${jsonString.slice(1)}`;
  }
  const enumString = enumItems.join(" | ");
  generatedTheme += `export const ${item.name}: Record<${enumString}, StyleValue> = ${jsonString};\n\n`;
}

await mkdir("./src/theme/__generated__", { recursive: true });
await writeFile("./src/theme/__generated__/tailwind-theme.ts", generatedTheme);
