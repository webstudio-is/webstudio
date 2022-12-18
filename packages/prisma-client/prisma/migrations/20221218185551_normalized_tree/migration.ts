import { PrismaClient } from "./client";

type Instance = {
  id: string;
  component: any;
  cssRules: Array<any>;
  children: Array<Instance | string>;
};

type NormalizedInstance = {
  id: string;
  component: any;
  cssRules: Array<any>;
  children: (number | string)[];
};

const normalizeTree = (rootInstance: Instance) => {
  const normalizedTree: NormalizedInstance[] = [];
  const traverse = (
    instance: Instance,
    normalizedInstance: NormalizedInstance
  ) => {
    for (const child of instance.children) {
      if (typeof child === "string") {
        normalizedInstance.children.push(child);
      } else {
        const normalizedChild = {
          id: child.id,
          component: child.component,
          cssRules: child.cssRules,
          children: [],
        };
        // push returns length
        const index = normalizedTree.push(normalizedChild) - 1;
        normalizedInstance.children.push(index);
        traverse(child, normalizedChild);
      }
    }
  };
  const normalizedRootInstance: NormalizedInstance = {
    id: rootInstance.id,
    component: rootInstance.component,
    cssRules: rootInstance.cssRules,
    children: [],
  };
  normalizedTree.push(normalizedRootInstance);
  traverse(rootInstance, normalizedRootInstance);
  return normalizedTree;
};

export default () => {
  const client = new PrismaClient({
    // Uncomment to see the queries in console as the migration runs
    // log: ["query", "info", "warn", "error"],
  });
  return client.$transaction(
    async (prisma) => {
      const previousTrees = await prisma.tree.findMany();
      const update = previousTrees.map((tree) => {
        return {
          id: tree.id,
          root: JSON.stringify(normalizeTree(JSON.parse(tree.root))),
        };
      });
      await Promise.all(
        update.map(({ id, ...data }) =>
          prisma.tree.update({ where: { id }, data })
        )
      );
    },
    { timeout: 1000 * 60 }
  );
};
