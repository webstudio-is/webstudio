import { PrismaClient } from "./client";

type PropsItem = {
  instanceId: string;
  id: string;
  name: string;
  required?: boolean;
  type: string;
  value: unknown;
};

export default async () => {
  const client = new PrismaClient({
    // Uncomment to see the queries in console as the migration runs
    // log: ["query", "info", "warn", "error"],
  });

  await client.$transaction(
    async (prisma) => {
      let cursor: undefined | string = undefined;
      let hasNext = true;

      while (hasNext) {
        const chunkSize = 1000;
        const trees: any[] = await prisma.tree.findMany({
          take: chunkSize,
          orderBy: {
            id: "asc",
          },
          ...(cursor
            ? {
                skip: 1, // Skip the cursor
                cursor: { id: cursor },
              }
            : null),
        });
        cursor = trees.at(-1)?.id;
        hasNext = trees.length === chunkSize;

        const treesProps = await prisma.instanceProps.findMany({
          where: {
            treeId: {
              in: trees.map((tree) => tree.id),
            },
          },
        });

        for (const tree of trees) {
          const instanceProps = treesProps.filter(
            (props) => props.treeId === tree.id
          );
          try {
            const list: PropsItem[] = [];
            for (const { instanceId, props } of instanceProps) {
              const parsed = JSON.parse(props);
              for (const prop of parsed) {
                list.push({
                  instanceId,
                  id: prop.id,
                  name: prop.prop,
                  required: prop.required,
                  type: prop.type,
                  value: prop.value,
                });
              }
            }

            tree.props = JSON.stringify(list);
          } catch {
            console.info(`Tree ${tree.id} cannot be converted`);
          }
        }
        await Promise.all(
          trees.map(({ id, props }) =>
            prisma.tree.update({ where: { id }, data: { props } })
          )
        );
      }
    },
    { timeout: 1000 * 60 * 5 }
  );
};
