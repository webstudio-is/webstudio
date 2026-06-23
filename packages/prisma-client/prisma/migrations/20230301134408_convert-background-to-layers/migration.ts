import { z } from "zod";
import { PrismaClient } from "./client";

const unit = z.string();

type Unit = z.infer<typeof unit>;

const unitValue = z.object({
  type: z.literal("unit"),
  unit: unit,
  value: z.number(),
});

type UnitValue = z.infer<typeof unitValue>;

const keywordValue = z.object({
  type: z.literal("keyword"),
  // @todo use exact type
  value: z.string(),
});
type KeywordValue = z.infer<typeof keywordValue>;

/**
 * Valid unparsed css value
 **/
const unparsedValue = z.object({
  type: z.literal("unparsed"),
  value: z.string(),
});

const fontFamilyValue = z.object({
  type: z.literal("fontFamily"),
  value: z.array(z.string()),
});
type FontFamilyValue = z.infer<typeof fontFamilyValue>;

const rgbValue = z.object({
  type: z.literal("rgb"),
  r: z.number(),
  g: z.number(),
  b: z.number(),
  alpha: z.number(),
});
type RgbValue = z.infer<typeof rgbValue>;

const imageValue = z.object({
  type: z.literal("image"),
  value: z.object({ type: z.literal("asset"), value: z.unknown() }),
});

type ImageValue = z.infer<typeof imageValue>;

// We want to be able to render the invalid value
// and show it is invalid visually, without saving it to the db
const invalidValue = z.object({
  type: z.literal("invalid"),
  value: z.string(),
});
type InvalidValue = z.infer<typeof invalidValue>;

const unsetValue = z.object({
  type: z.literal("unset"),
  value: z.literal(""),
});
type UnsetValue = z.infer<typeof unsetValue>;

/**
 * Shared zod types with DB types.
 * ImageValue in DB has a different type
 */
const sharedStaticStyleValue = z.union([
  unitValue,
  keywordValue,
  fontFamilyValue,
  rgbValue,
  unparsedValue,
]);

const validStaticStyleValue = z.union([imageValue, sharedStaticStyleValue]);

type ValidStaticStyleValue = z.infer<typeof validStaticStyleValue>;

const varValue = z.object({
  type: z.literal("var"),
  value: z.string(),
  fallbacks: z.array(validStaticStyleValue),
});
type VarValue = z.infer<typeof varValue>;

/**
 * Shared types with DB types
 */
const sharedStyleValue = z.union([
  sharedStaticStyleValue,
  invalidValue,
  unsetValue,
  varValue,
]);

const storedImageValue = z.object({
  type: z.literal("image"),
  value: z.object({ type: z.literal("asset"), value: z.string() }),
});

const storedLayersValue = z.object({
  type: z.literal("layers"),
  value: z.array(
    z.union([
      unitValue,
      keywordValue,
      unparsedValue,
      storedImageValue,
      invalidValue,
    ])
  ),
});

export const storedStyleDecl = z.object({
  styleSourceId: z.string(),
  breakpointId: z.string(),
  // @todo can't figure out how to make property to be enum
  property: z.string(),
  value: z.union([storedImageValue, storedLayersValue, sharedStyleValue]),
});

type StoredStyleDecl = z.infer<typeof storedStyleDecl>;

const layeredBackgroundProps = [
  "backgroundAttachment",
  "backgroundClip",
  "backgroundBlendMode",
  "backgroundImage",
  "backgroundOrigin",
  "backgroundPositionX",
  "backgroundPositionY",
  "backgroundRepeat",
  "backgroundSize",
];

export default () => {
  const client = new PrismaClient({
    // Uncomment to see the queries in console as the migration runs
    // log: ["query", "info", "warn", "error"],
  });
  return client.$transaction(
    async (prisma) => {
      let cursor: undefined | { id: string; projectId: string } = undefined;
      let hasNext = true;
      const chunkSize = 1000;

      hasNext = true;
      while (hasNext) {
        const builds = await prisma.build.findMany({
          take: chunkSize,
          where: {
            OR: [{ isDev: true }, { isProd: true }],
          },
          orderBy: {
            id: "asc",
          },
          ...(cursor
            ? {
                skip: 1, // Skip the cursor
                cursor: { id_projectId: cursor },
              }
            : null),
        });
        const lastBuild = builds.at(-1);
        if (lastBuild) {
          cursor = { id: lastBuild.id, projectId: lastBuild.projectId };
        }
        hasNext = builds.length === chunkSize;

        const buildsToUpdate = [];

        for (const build of builds) {
          let hasConversion = false;

          const styles: StoredStyleDecl[] = JSON.parse(build.styles);

          for (const style of styles) {
            if (layeredBackgroundProps.includes(style.property)) {
              if (
                style.value.type === "image" ||
                style.value.type === "unit" ||
                style.value.type === "unparsed" ||
                style.value.type === "keyword"
              ) {
                hasConversion = true;

                style.value = {
                  type: "layers",
                  value: [style.value],
                };
              } else {
                console.warn("unsupported style value", style.value);
              }
            }
          }

          if (hasConversion) {
            build.styles = JSON.stringify(styles);
            buildsToUpdate.push(build as never);
          }
        }

        await Promise.all(
          buildsToUpdate.map(({ id, projectId, styles }) =>
            prisma.build.update({
              where: { id_projectId: { id, projectId } },
              data: { styles },
            })
          )
        );
      }
    },
    { timeout: 1000 * 60 * 8 }
  );
};
