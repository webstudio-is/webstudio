import { nanoid } from "nanoid";
import { PrismaClient } from "./client";

const showAttribute = "data-ws-show";

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
  );

type PropsList = Prop[];

type DataSourceVariableValue =
  | { type: "number"; value: number }
  | { type: "string"; value: string }
  | { type: "boolean"; value: boolean }
  | { type: "string[]"; value: string[] };

type DataSource =
  | {
      type: "variable";
      id: string;
      scopeInstanceId?: string;
      name: string;
      value: DataSourceVariableValue;
    }
  | {
      type: "expression";
      id: string;
      scopeInstanceId?: string;
      name: string;
      code: string;
    };

type DataSourcesList = DataSource[];

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
            const dataSourcesList: DataSourcesList = JSON.parse(
              build.dataSources
            );

            const instances = new Map(
              instancesList.map((instance) => [instance.id, instance])
            );
            let changed = false;

            const formInstanceIds = new Set<string>();

            for (const instance of instancesList) {
              if (instance.component === "Form") {
                formInstanceIds.add(instance.id);
                const formDataSourceId = nanoid();
                const formState = encodeDataSourceVariable(formDataSourceId);
                dataSourcesList.push({
                  type: "variable",
                  id: formDataSourceId,
                  scopeInstanceId: instance.id,
                  name: "formState",
                  value: {
                    type: "string",
                    value: "initial",
                  },
                });
                propsList.push({
                  id: nanoid(),
                  instanceId: instance.id,
                  type: "dataSource",
                  name: "state",
                  value: formDataSourceId,
                });

                // add show bindings to all direct children
                for (const child of instance.children) {
                  if (child.type !== "id") {
                    continue;
                  }
                  const chillInstance = instances.get(child.value);
                  if (chillInstance === undefined) {
                    continue;
                  }
                  const childDataSourceId = nanoid();
                  propsList.push({
                    id: nanoid(),
                    instanceId: chillInstance.id,
                    type: "dataSource",
                    name: showAttribute,
                    value: childDataSourceId,
                  });
                  if (chillInstance.component === "ErrorMessage") {
                    dataSourcesList.push({
                      type: "expression",
                      id: childDataSourceId,
                      scopeInstanceId: chillInstance.id,
                      name: "formError",
                      code: `${formState} === 'error'`,
                    });
                  } else if (chillInstance.component === "SuccessMessage") {
                    dataSourcesList.push({
                      type: "expression",
                      id: childDataSourceId,
                      scopeInstanceId: chillInstance.id,
                      name: "formSuccess",
                      code: `${formState} === 'success'`,
                    });
                  } else {
                    dataSourcesList.push({
                      type: "expression",
                      id: childDataSourceId,
                      scopeInstanceId: chillInstance.id,
                      name: "formInitial",
                      code: `${formState} === 'initial' || ${formState} === 'error'`,
                    });
                  }
                }

                changed = true;
              }
              if (instance.component === "ErrorMessage") {
                instance.component = "Box";
                instance.label = "Error Message";
                changed = true;
              }
              if (instance.component === "SuccessMessage") {
                instance.component = "Box";
                instance.label = "Success Message";
                changed = true;
              }
            }

            const newPropsList: PropsList = [];

            for (const prop of propsList) {
              if (
                prop.name === "initialState" &&
                formInstanceIds.has(prop.instanceId)
              ) {
                changed = true;
                continue;
              }
              newPropsList.push(prop);
            }

            if (changed) {
              build.instances = JSON.stringify(instancesList);
              build.props = JSON.stringify(newPropsList);
              build.dataSources = JSON.stringify(dataSourcesList);
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
