import { z } from "zod";
import { PrismaClient } from "./client";

const Unit = z.string();

type Unit = z.infer<typeof Unit>;

const UnitValue = z.object({
  type: z.literal("unit"),
  unit: Unit,
  value: z.number(),
});

type UnitValue = z.infer<typeof UnitValue>;

const KeywordValue = z.object({
  type: z.literal("keyword"),
  // @todo use exact type
  value: z.string(),
});
type KeywordValue = z.infer<typeof KeywordValue>;

/**
 * Valid unparsed css value
 **/
const UnparsedValue = z.object({
  type: z.literal("unparsed"),
  value: z.string(),
});

const FontFamilyValue = z.object({
  type: z.literal("fontFamily"),
  value: z.array(z.string()),
});
type FontFamilyValue = z.infer<typeof FontFamilyValue>;

const RgbValue = z.object({
  type: z.literal("rgb"),
  r: z.number(),
  g: z.number(),
  b: z.number(),
  alpha: z.number(),
});
type RgbValue = z.infer<typeof RgbValue>;

const ImageValue = z.object({
  type: z.literal("image"),
  value: z.object({ type: z.literal("asset"), value: z.unknown() }),
});

type ImageValue = z.infer<typeof ImageValue>;

// We want to be able to render the invalid value
// and show it is invalid visually, without saving it to the db
const InvalidValue = z.object({
  type: z.literal("invalid"),
  value: z.string(),
});
type InvalidValue = z.infer<typeof InvalidValue>;

const UnsetValue = z.object({
  type: z.literal("unset"),
  value: z.literal(""),
});
type UnsetValue = z.infer<typeof UnsetValue>;

/**
 * Shared zod types with DB types.
 * ImageValue in DB has a different type
 */
const SharedStaticStyleValue = z.union([
  UnitValue,
  KeywordValue,
  FontFamilyValue,
  RgbValue,
  UnparsedValue,
]);

const ValidStaticStyleValue = z.union([ImageValue, SharedStaticStyleValue]);

type ValidStaticStyleValue = z.infer<typeof ValidStaticStyleValue>;

const VarValue = z.object({
  type: z.literal("var"),
  value: z.string(),
  fallbacks: z.array(ValidStaticStyleValue),
});
type VarValue = z.infer<typeof VarValue>;

/**
 * Shared types with DB types
 */
const SharedStyleValue = z.union([
  SharedStaticStyleValue,
  InvalidValue,
  UnsetValue,
  VarValue,
]);

const StoredImageValue = z.object({
  type: z.literal("image"),
  value: z.object({ type: z.literal("asset"), value: z.string() }),
});

const StoredLayersValue = z.object({
  type: z.literal("layers"),
  value: z.array(
    z.union([
      UnitValue,
      KeywordValue,
      UnparsedValue,
      StoredImageValue,
      InvalidValue,
    ])
  ),
});

export const StoredStyleDecl = z.object({
  styleSourceId: z.string(),
  breakpointId: z.string(),
  // @todo can't figure out how to make property to be enum
  property: z.string(),
  value: z.union([StoredImageValue, StoredLayersValue, SharedStyleValue]),
});

type StoredStyleDecl = z.infer<typeof StoredStyleDecl>;

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
                // eslint-disable-next-line no-console
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
