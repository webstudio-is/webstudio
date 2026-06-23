import { z } from "zod";
import { PrismaClient } from "./client";

const baseUserProps = {
  id: z.string(),
  prop: z.string(),
  required: z.optional(z.boolean()),
};

export const userDbProp = z.discriminatedUnion("type", [
  z.object({
    ...baseUserProps,
    type: z.literal("number"),
    value: z.number(),
  }),
  z.object({
    ...baseUserProps,
    type: z.literal("string"),
    value: z.string(),
  }),
  z.object({
    ...baseUserProps,
    type: z.literal("boolean"),
    value: z.boolean(),
  }),
  z.object({
    ...baseUserProps,
    type: z.literal("asset"),
    // In database we hold asset.id
    value: z.string(),
  }),
]);

const userDbProps = z.array(userDbProp);
type UserDbProp = z.infer<typeof userDbProp>;

const outdatedProp = z.object({
  ...baseUserProps,
  value: z.optional(z.union([z.string(), z.number(), z.boolean()])),
  asset_id: z.optional(z.string()),
  assetId: z.optional(z.string()),
  type: z.optional(z.string()),
});

const outdatedProps = z.array(outdatedProp);

export default () => {
  const client = new PrismaClient({
    // Uncomment to see the queries in console as the migration runs
    // log: ["query", "info", "warn", "error"],
  });
  return client.$transaction(
    async (prisma) => {
      const allInstanceProps = await prisma.instanceProps.findMany({
        where: {
          props: {
            not: {
              equals: "[]",
            },
          },
        },
      });

      for (const instanceProps of allInstanceProps) {
        const rawProps = JSON.parse(instanceProps.props);
        const props = outdatedProps.parse(rawProps);

        const newProps: UserDbProp[] = [];

        let need_update = false;

        for (const prop of props) {
          if (prop.type != null) {
            const dbProp = userDbProp.parse(prop);
            newProps.push(dbProp);
            continue;
          }

          need_update = true;

          if (prop.assetId != null) {
            newProps.push({
              id: prop.id,
              prop: prop.prop,
              required: prop.required,
              type: "asset",
              value: prop.assetId,
            });
            continue;
          }

          if (prop.asset_id != null) {
            newProps.push({
              id: prop.id,
              prop: prop.prop,
              required: prop.required,
              type: "asset",
              value: prop.asset_id,
            });
            continue;
          }

          if (prop.value == null) {
            continue;
          }

          if (typeof prop.value === "string") {
            newProps.push({
              id: prop.id,
              prop: prop.prop,
              required: prop.required,
              type: "string",
              value: prop.value,
            });
            continue;
          }

          if (typeof prop.value === "boolean") {
            newProps.push({
              id: prop.id,
              prop: prop.prop,
              required: prop.required,
              type: "boolean",
              value: prop.value,
            });
            continue;
          }

          if (typeof prop.value === "number") {
            newProps.push({
              id: prop.id,
              prop: prop.prop,
              required: prop.required,
              type: "number",
              value: prop.value,
            });
            continue;
          }

          throw new Error(`Unexpected prop type ${typeof prop.value}`);
        }

        if (need_update) {
          await prisma.instanceProps.update({
            where: { id: instanceProps.id },
            data: { props: JSON.stringify(userDbProps.parse(newProps)) },
          });
        }
      }
    },
    { timeout: 1000 * 60 }
  );
};
