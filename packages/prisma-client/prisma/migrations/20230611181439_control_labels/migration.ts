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
        const changedBuilds: typeof builds = [];

        for (const build of builds) {
          const buildId = build.id;
          try {
            const instancesList: InstancesList = JSON.parse(build.instances);
            let changed = false;

            for (const instance of instancesList) {
              if (instance.component === "RadioButtonField") {
                instance.component = "Label";
                instance.label = "Radio Field";
                changed = true;
              }
              if (instance.component === "CheckboxField") {
                instance.component = "Label";
                instance.label = "Checkbox Field";
                changed = true;
              }
            }

            if (changed) {
              build.instances = JSON.stringify(instancesList);
              changedBuilds.push(build);
            }
          } catch {
            console.info(`build ${buildId} cannot be converted`);
          }
        }
        await Promise.all(
          changedBuilds.map(({ id, instances }) =>
            prisma.build.update({ where: { id }, data: { instances } })
          )
        );
      }
    },
    { timeout: 1000 * 60 * 8 }
  );
};
