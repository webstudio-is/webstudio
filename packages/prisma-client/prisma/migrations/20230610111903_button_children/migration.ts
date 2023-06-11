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
    | {
        type: "page";
        value: string | { pageId: string; instanceId: string };
      }
    | { type: "string[]"; value: string[] }
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

        for (const build of builds) {
          const buildId = build.id;
          try {
            const instancesList: InstancesList = JSON.parse(build.instances);
            const propsList: PropsList = JSON.parse(build.props);
            const newPropsList: PropsList = [];
            const buttonInstanceIds = new Set<string>();
            const buttonInnerTexts = new Map<string, string>();

            for (const instance of instancesList) {
              if (
                instance.component === "Button" ||
                instance.component === "VimeoPlayButton"
              ) {
                buttonInstanceIds.add(instance.id);
              }
            }

            for (const prop of propsList) {
              if (
                buttonInstanceIds.has(prop.instanceId) &&
                prop.name === "innerText"
              ) {
                if (prop.type === "string") {
                  buttonInnerTexts.set(prop.instanceId, prop.value);
                }
                continue;
              }
              newPropsList.push(prop);
            }

            for (const instance of instancesList) {
              if (
                instance.component === "Button" ||
                instance.component === "VimeoPlayButton"
              ) {
                const innerText = buttonInnerTexts.get(instance.id);
                if (instance.children.length !== 0 || innerText === undefined) {
                  continue;
                }
                instance.children.push({ type: "text", value: innerText });
              }
            }

            build.instances = JSON.stringify(instancesList);
            build.props = JSON.stringify(newPropsList);
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
