/* eslint-disable no-console */

import { execSync } from "child_process";
import camelCase from "camelcase";
import { readFileSync, writeFileSync, existsSync, rmSync } from "fs";
import { z, type ZodType, type ZodTypeDef } from "zod";

const SOURCE_FILE = "./src/__generated__/figma-design-tokens.json";
const TMP_OUTPUT_FILE = "./src/__generated__/figma-design-tokens.tmp";
const OUTPUT_FILE = "./src/__generated__/figma-design-tokens.ts";

// https://developer.mozilla.org/en-US/docs/Web/CSS/font-weight#common_weight_name_mapping
// (hopefully the fonts we use, Figma, Tokens plugin — all follow this convention)
const fontWeightMapping = {
  thin: 100,
  hairline: 100,
  extralight: 200,
  ultralight: 200,
  light: 300,
  normal: 400,
  regular: 400,
  medium: 500,
  semibold: 600,
  demibold: 600,
  bold: 700,
  extrabold: 800,
  ultrabold: 800,
  black: 900,
  heavy: 900,
  extrablack: 950,
  ultrablack: 950,
} as const;

const fontFamilies = {
  Inter:
    "Inter Variable, InterVariable, Inter, -apple-system, system-ui, sans-serif",
  Manrope: "Manrope Variable, ManropeVariable, Manrope, sans-serif",
  Roboto: "Roboto Mono, RobotoMono, menlo, monospace",
} as const;
const fontFamilyMapping = {
  ...fontFamilies,
  InterVariable: fontFamilies.Inter,
  "Inter Variable": fontFamilies.Inter,
  ManropeVariable: fontFamilies.Manrope,
  "Manrope Variable": fontFamilies.Manrope,
  "Roboto Mono": fontFamilies.Roboto,
} as const;

const TreeLeafSchema = z.object({
  type: z.string(),
  value: z.unknown(),
});

const FontWeightSchema = z.preprocess(
  (x) => (typeof x === "string" ? x.toLowerCase().replace(/\s+/g, "") : x),
  z.enum(Object.keys(fontWeightMapping) as [keyof typeof fontWeightMapping])
);

const FontFamilySchema = z.string();

const LineHeightSchema = z.union([z.string(), z.number()]);

const FontSizeSchema = z.number();

const LetterSpacingSchema = z.union([z.string(), z.number()]);

const TextCaseSchema = z.enum(["uppercase", "lowercase", "capitalize", "none"]);

const TextDecorationSchema = z.enum([
  "none",
  "underline",
  "overline",
  "line-through",
]);

const DimentionSchema = z.union([z.string(), z.number()]);

const TypographySchema = z.object({
  fontFamily: z.unknown(),
  fontWeight: z.unknown(),
  lineHeight: z.unknown(),
  fontSize: z.unknown(),
  letterSpacing: z.unknown(),
  textCase: z.unknown(),
  textDecoration: z.unknown(),
  paragraphIndent: z.unknown(),
});

const SingleShadowSchema = z.object({
  color: z.string(),
  type: z.enum(["dropShadow", "innerShadow"]),
  x: z.number(),
  y: z.number(),
  blur: z.number(),
  spread: z.number(),
});

const ShadowSchema = z.union([SingleShadowSchema, z.array(SingleShadowSchema)]);

const parse = <Output, Def extends ZodTypeDef, Input>(
  path: string[],
  value: unknown,
  schema: ZodType<Output, Def, Input>
) => {
  const result = schema.safeParse(value);
  if (result.success === false) {
    throw new Error(
      `Could not parse ${path.join(" > ")}. Got a error: ${
        result.error.message
      }`
    );
  }
  return result.data;
};

const printShadow = (path: string[], unparsedValue: unknown) => {
  const shadow = parse(path, unparsedValue, ShadowSchema);
  const printSingle = (shadow: z.infer<typeof SingleShadowSchema>) => {
    return [
      shadow.type === "innerShadow" ? "inset" : "",
      `${shadow.x}px`,
      `${shadow.y}px`,
      `${shadow.blur}px`,
      `${shadow.spread}px`,
      `${shadow.color}`,
    ]
      .join(" ")
      .trim();
  };
  return Array.isArray(shadow)
    ? shadow.map(printSingle).join(", ")
    : printSingle(shadow);
};

const printLineHeight = (path: string[], unparsedValue: unknown) => {
  const value = parse(path, unparsedValue, LineHeightSchema);

  if (typeof value === "number") {
    return `${value}px`;
  }
  // @todo: figure out how to convert AUTO to pixels or something
  // https://discord.com/channels/955905230107738152/1065939291479478343
  if (value === "AUTO") {
    return undefined;
  }
  if (value.endsWith("%")) {
    return value;
  }
  throw new Error(
    `Could not parse "${path.join(" > ")} > lineHeight": ${value}`
  );
};

const printLetterSpacing = (path: string[], unparsedValue: unknown) => {
  const value = parse(path, unparsedValue, LetterSpacingSchema);

  if (typeof value === "number") {
    return `${value}px`;
  }
  if (/^-?[0-9]+(.[0-9]+)?%$/.test(value)) {
    const fraction = parseFloat(value) / 100;
    return `${fraction}em`;
  }
  throw new Error(
    `Could not parse "${path.join(" > ")} > letterSpacing": ${value}`
  );
};

const printFontWeight = (path: string[], unparsedValue: unknown) => {
  const value = parse(path, unparsedValue, FontWeightSchema);
  return fontWeightMapping[value];
};

const printFontFamily = (path: string[], unparsedValue: unknown) => {
  const value = parse(path, unparsedValue, FontFamilySchema);
  return fontFamilyMapping[value] || value;
};

const printFontSize = (path: string[], unparsedValue: unknown) => {
  const value = parse(path, unparsedValue, FontSizeSchema);
  return `${value}px`;
};

const printTextCase = (path: string[], unparsedValue: unknown) => {
  return parse(path, unparsedValue, TextCaseSchema);
};

const printTextDecoration = (path: string[], unparsedValue: unknown) => {
  return parse(path, unparsedValue, TextDecorationSchema);
};

const printDimension = (path: string[], unparsedValue: unknown) => {
  const value = parse(path, unparsedValue, DimentionSchema);
  if (typeof value === "number") {
    return `${value}px`;
  }
  return value;
};

const printTypography = (path: string[], unparsedValue: unknown) => {
  const value = parse(path, unparsedValue, TypographySchema);
  return {
    fontFamily: printFontFamily(path, value.fontFamily),
    fontWeight: printFontWeight(path, value.fontWeight),
    fontSize: printFontSize(path, value.fontSize),
    lineHeight: printLineHeight(path, value.lineHeight),
    letterSpacing: printLetterSpacing(path, value.letterSpacing),
    textTransform: printTextCase(path, value.textCase),
    textDecoration: printTextDecoration(path, value.textDecoration),
    textIndent: printDimension(path, value.paragraphIndent),
  };
};

const printerByType = {
  boxShadow: printShadow,
  typography: printTypography,
  letterSpacing: printLetterSpacing,
  lineHeights: printLineHeight,
  fontWeights: printFontWeight,
  fontSizes: printFontSize,
  fontFamilies: printFontFamily,
  textCase: printTextCase,
  textDecoration: printTextDecoration,
  dimension: printDimension,
} as const;

const traverse = (
  node: unknown,
  nodePath: string[],
  fn: (path: string[], type: string, value: unknown) => void
) => {
  if (typeof node !== "object" || node === null) {
    return;
  }

  const asLeaf = TreeLeafSchema.safeParse(node);
  if (asLeaf.success && asLeaf.data.value !== undefined) {
    fn(nodePath, asLeaf.data.type, asLeaf.data.value);
    return;
  }

  for (const [key, value] of Object.entries(node)) {
    traverse(value, [...nodePath, key], fn);
  }
};

const pathToName = (path: string[], type: string) => {
  const cleanedUp = camelCase(path.join(" ").replace(/[^a-z0-9]+/gi, " "), {
    locale: false,
  });

  const withoutType = cleanedUp
    .toLocaleLowerCase()
    .startsWith(type.toLocaleLowerCase())
    ? cleanedUp.slice(type.length)
    : cleanedUp;

  // apply camelCase again to make sure
  // the first letter is lowercase after removing the type
  return camelCase(withoutType, { locale: false });
};

const main = () => {
  execSync(`token-transformer ${SOURCE_FILE} ${TMP_OUTPUT_FILE}`, {
    stdio: "inherit",
  });

  const data = JSON.parse(readFileSync(TMP_OUTPUT_FILE, "utf-8"));

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const byType = new Map<string, Record<string, any>>();

  traverse(data, [], (path, type, value) => {
    const record = byType.get(type) ?? {};
    byType.set(type, record);

    // no need to check for __proto__ (prototype polution)
    // because we know pathToName returns a string without "_"
    record[pathToName(path, type)] =
      type in printerByType ? printerByType[type](path, value) : value;
  });

  writeFileSync(
    OUTPUT_FILE,
    `// Generated by transform-figma-tokens.ts from ${SOURCE_FILE}\n\n` +
      [...byType.entries()]
        .map(
          ([type, values]) =>
            `export const ${type} = ${JSON.stringify(values)} as const`
        )
        .join(";\n\n")
  );

  execSync(`prettier --write ${OUTPUT_FILE}`, { stdio: "inherit" });
};

const cleanup = () => {
  if (existsSync(TMP_OUTPUT_FILE)) {
    rmSync(TMP_OUTPUT_FILE);
  }
};

try {
  main();
} catch (error) {
  try {
    cleanup();
  } catch (cleanupError) {
    console.error("Cleanup failed:", cleanupError);
  }
  throw error;
}
cleanup();
