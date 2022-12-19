import { PrismaClient } from "./client";

type PrevInstance = {
  id: string;
  component: any;
  cssRules: Array<any>;
  children: Array<PrevInstance | string>;
};

type Text = {
  type: "text";
  value: string;
};

type Instance = {
  type: "instance";
  id: string;
  component: any;
  cssRules: Array<any>;
  children: Array<Instance | Text>;
};

const convertTree = (prevInstance: PrevInstance): Instance => {
  const instance: Instance = {
    type: "instance",
    id: prevInstance.id,
    component: prevInstance.component,
    cssRules: prevInstance.cssRules,
    children: [],
  };

  for (const child of prevInstance.children) {
    if (typeof child === "string") {
      instance.children.push({ type: "text", value: child });
    } else {
      instance.children.push(convertTree(child));
    }
  }
  return instance;
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
        let newRoot = tree.root;
        try {
          newRoot = JSON.stringify(convertTree(JSON.parse(tree.root)));
        } catch {
          console.info(`Tree ${tree.id} cannot be converted`);
        }
        return {
          id: tree.id,
          root: newRoot,
        };
      });
      await Promise.all(
        update.map(({ id, ...data }) =>
          prisma.tree.update({ where: { id }, data })
        )
      );
    },
    { timeout: 1000 * 60 * 5 }
  );
};
