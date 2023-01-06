import { PrismaClient } from "./client";

type StylesItem = {
  breakpointId: string;
  instanceId: string;
  property: string;
  value: unknown;
};

type Styles = StylesItem[];

type CssRule = {
  breakpoint: undefined | string;
  style: Record<string, unknown>;
};

type Text = {
  type: "text";
  value: string;
};

type Instance = {
  type: "instance";
  id: string;
  component: string;
  cssRules: Array<CssRule>;
  children: Array<Instance | Text>;
};

const convertTree = (instance: Instance, styles: Styles) => {
  for (const rule of instance.cssRules) {
    if (rule.breakpoint === undefined) {
      continue;
    }
    for (const [property, value] of Object.entries(rule.style)) {
      styles.push({
        breakpointId: rule.breakpoint,
        instanceId: instance.id,
        property,
        value,
      });
    }
  }
  instance.cssRules = [];
  for (const child of instance.children) {
    if (child.type === "instance") {
      convertTree(child, styles);
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
            const styles: Styles = [];
            convertTree(root, styles);
            tree.root = JSON.stringify(root);
            tree.styles = JSON.stringify(styles);
          } catch {
            console.info(`Tree ${tree.id} cannot be converted`);
          }
        }
        await Promise.all(
          trees.map(({ id, root, styles }) =>
            prisma.tree.update({ where: { id }, data: { root, styles } })
          )
        );
      }
    },
    { timeout: 1000 * 60 * 5 }
  );
};
