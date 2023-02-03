import { nanoid } from "nanoid";
import { PrismaClient } from "./client";

type InstanceId = string;
type StyleSourceId = string;
type BuildId = string;
type TreeId = string;

type TreeStyleDecl = {
  breakpointId: string;
  instanceId: InstanceId;
  property: string;
  value: unknown;
};

type TreeStyles = TreeStyleDecl[];

type StyleDecl = {
  styleSourceId: StyleSourceId;
  breakpointId: string;
  property: string;
  value: unknown;
};

type Styles = StyleDecl[];

type StyleSource = {
  type: "local";
  id: StyleSourceId;
  treeId: TreeId;
};

type StyleSources = StyleSource[];

type StyleSourceSelection = {
  instanceId: InstanceId;
  values: StyleSourceId[];
};

type StyleSourceSelections = StyleSourceSelection[];

export default async () => {
  const client = new PrismaClient({
    // Uncomment to see the queries in console as the migration runs
    // log: ["query", "info", "warn", "error"],
  });

  await client.$transaction(
    async (prisma) => {
      let stylesPerBuild = new Map<BuildId, Styles>();
      let styleSourcesPerBuild = new Map<BuildId, StyleSources>();

      const chunkSize = 1000;
      let cursor: undefined | string = undefined;
      let hasNext = true;
      while (hasNext) {
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
          const treeId = tree.id;
          try {
            const treeStyles: TreeStyles = JSON.parse(tree.styles);
            const styles: Styles = [];
            const styleSources: StyleSources = [];
            const styleSelections: StyleSourceSelections = [];
            const styleSourceIdPerInstanceId = new Map<
              InstanceId,
              StyleSourceId
            >();

            for (const styleDecl of treeStyles) {
              const { instanceId, breakpointId, property, value } = styleDecl;
              let styleSourceId = styleSourceIdPerInstanceId.get(instanceId);
              if (styleSourceId === undefined) {
                styleSourceId = nanoid();
                styleSourceIdPerInstanceId.set(instanceId, styleSourceId);
              }

              styles.push({
                styleSourceId,
                breakpointId,
                property,
                value,
              });
              styleSources.push({
                id: styleSourceId,
                treeId,
                type: "local",
              });
              styleSelections.push({
                instanceId,
                values: [styleSourceId],
              });
            }

            stylesPerBuild.set(tree.buildId, styles);
            styleSourcesPerBuild.set(tree.buildId, styleSources);
            tree.styleSelections = JSON.stringify(styleSelections);
          } catch {
            console.info(`Tree ${treeId} cannot be converted`);
          }
        }
        await Promise.all(
          trees.map(({ id, styleSelections }) =>
            prisma.tree.update({ where: { id }, data: { styleSelections } })
          )
        );
      }

      cursor = undefined;
      hasNext = true;
      while (hasNext) {
        const builds = await prisma.build.findMany({
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
        cursor = builds.at(-1)?.id;
        hasNext = builds.length === chunkSize;

        for (const build of builds) {
          const buildId = build.id;
          const styles = stylesPerBuild.get(buildId) ?? [];
          const styleSources = styleSourcesPerBuild.get(buildId) ?? [];
          build.styles = JSON.stringify(styles);
          build.styleSources = JSON.stringify(styleSources);
        }
        await Promise.all(
          builds.map(({ id, styles, styleSources }) =>
            prisma.build.update({
              where: { id },
              data: { styles, styleSources },
            })
          )
        );
      }
    },
    { timeout: 1000 * 60 * 8 }
  );
};
