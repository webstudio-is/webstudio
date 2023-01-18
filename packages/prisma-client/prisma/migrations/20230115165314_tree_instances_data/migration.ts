import { PrismaClient } from "./client";

type Text = {
  type: "text";
  value: string;
};

type Id = {
  type: "id";
  value: string;
};

type Instance = {
  type: "instance";
  id: string;
  component: string;
  cssRules: Array<any>;
  children: Array<Instance | Text>;
};

type InstancesItem = {
  type: "instance";
  id: string;
  component: string;
  children: Array<Id | Text>;
};

const convertTree = (instance: Instance, instances: InstancesItem[]) => {
  const instancesItem: InstancesItem = {
    type: "instance",
    id: instance.id,
    component: instance.component,
    children: [],
  };
  instances.push(instancesItem);
  for (const child of instance.children) {
    if (child.type === "instance") {
      convertTree(child, instances);
      instancesItem.children.push({ type: "id", value: child.id });
    } else {
      instancesItem.children.push(child);
    }
  }
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
        const trees = await prisma.tree.findMany({
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

        for (const tree of trees) {
          try {
            const root = JSON.parse(tree.root);
            const instances: InstancesItem[] = [];
            convertTree(root, instances);
            tree.instances = JSON.stringify(instances);
          } catch {
            console.info(`Tree ${tree.id} cannot be converted`);
          }
        }
        await Promise.all(
          trees.map(({ id, instances }) =>
            prisma.tree.update({ where: { id }, data: { instances } })
          )
        );
      }
    },
    { timeout: 1000 * 60 * 5 }
  );
};
