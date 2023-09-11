import { nanoid } from "nanoid";
import { PrismaClient } from "./client";

const dataSourceVariablePrefix = "$ws$dataSource$";

const encodeDataSourceVariable = (id: string) => {
  const encoded = id.replaceAll("-", "__DASH__");
  return `${dataSourceVariablePrefix}${encoded}`;
};

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

type BaseProp = {
  id: string;
  instanceId: string;
  name: string;
  required?: boolean;
};

type Prop = BaseProp &
  (
    | { type: "number"; value: number }
    | { type: "string"; value: string }
    | { type: "boolean"; value: boolean }
    | { type: "asset"; value: string }
    | { type: "page"; value: string | { pageId: string; instanceId: string } }
    | { type: "string[]"; value: string[] }
    | { type: "dataSource"; value: string }
    | {
        type: "action";
        value: Array<{ type: "execute"; args: string[]; code: string }>;
      }
  );

type PropsList = Prop[];

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
            const propsList: PropsList = JSON.parse(build.props);

            let changed = false;

            const formInstanceIds = new Set<string>();
            for (const instance of instancesList) {
              if (instance.component === "Form") {
                formInstanceIds.add(instance.id);
                changed = true;
              }
            }

            for (const prop of propsList) {
              if (
                prop.name === "state" &&
                formInstanceIds.has(prop.instanceId) &&
                prop.type === "dataSource"
              ) {
                const dataSourceId = prop.value;
                const formState = encodeDataSourceVariable(dataSourceId);
                propsList.push({
                  id: nanoid(),
                  instanceId: prop.instanceId,
                  type: "action",
                  name: "onStateChange",
                  value: [
                    {
                      type: "execute",
                      args: ["state"],
                      code: `${formState} = state`,
                    },
                  ],
                });
              }
            }

            if (changed) {
              build.instances = JSON.stringify(instancesList);
              build.props = JSON.stringify(propsList);
              changedBuilds.push(build);
            }
          } catch {
            console.info(`build ${buildId} cannot be converted`);
          }
        }
        await Promise.all(
          changedBuilds.map(({ id, instances, props, dataSources }) =>
            prisma.build.update({
              where: { id },
              data: { instances, props, dataSources },
            })
          )
        );
      }
    },
    { timeout: 1000 * 60 * 8 }
  );
};
