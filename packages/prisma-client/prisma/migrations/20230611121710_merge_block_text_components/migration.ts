import { PrismaClient } from "./client";

type Text = {
  type: "text";
  value: string;
};

type Id = {
  type: "id";
  value: string;
};

export type Instance = {
  type: "instance";
  id: string;
  component: string;
  label?: string;
  children: Array<Id | Text>;
};

type InstancesList = Instance[];

export default async () => {
  const client = new PrismaClient({
    // Uncomment to see the queries in console as the migration runs
    // log: ["query", "info", "warn", "error"],
  });

  await client.$transaction(
    async (prisma) => {
      const chunkSize = 1000;
      let cursor: undefined | string = undefined;
      let hasNext = true;
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
          try {
            const instancesList: InstancesList = JSON.parse(build.instances);

            for (const instance of instancesList) {
              if (instance.component === "TextBlock") {
                instance.component = "Text";
              }
              if (instance.component === "LinkBlock") {
                instance.component = "Link";
              }
            }

            build.instances = JSON.stringify(instancesList);
          } catch {
            console.info(`build ${buildId} cannot be converted`);
          }
        }
        await Promise.all(
          builds.map(({ id, instances, props }) =>
            prisma.build.update({ where: { id }, data: { instances, props } })
          )
        );
      }
    },
    { timeout: 1000 * 60 * 8 }
  );
};
