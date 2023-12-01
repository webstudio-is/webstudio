import { PrismaClient } from "./client";

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
    | { type: "expression"; value: string }
    | {
        type: "action";
        value: Array<{ type: "execute"; args: string[]; code: string }>;
      }
  );

type PropsList = Prop[];

type DataSourceVariableValue =
  | { type: "number"; value: number }
  | { type: "string"; value: string }
  | { type: "boolean"; value: boolean }
  | { type: "string[]"; value: string[] }
  | { type: "json"; value: unknown };

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

const dataSourceVariablePrefix = "$ws$dataSource$";

const encodeDataSourceVariable = (id: string) => {
  const encoded = id.replaceAll("-", "__DASH__");
  return `${dataSourceVariablePrefix}${encoded}`;
};

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
        console.log("CHUNK", cursor);
        console.time("read");

        const cursorOptions: {} = cursor
          ? {
              skip: 1, // Skip the cursor
              cursor: { id: cursor },
            }
          : {};

        const builds = await prisma.build.findMany({
          select: {
            id: true,
            props: true,
            dataSources: true,
          },
          take: chunkSize,
          orderBy: {
            id: "asc",
          },
          where: {
            AND: [
              {
                OR: [
                  {
                    props: {
                      not: "[]",
                    },
                  },
                  {
                    dataSources: {
                      not: "[]",
                    },
                  },
                ],
              },
              {
                deployment: null,
              },
            ],
          },

          ...cursorOptions,
        });
        console.timeEnd("read");

        console.time("parse-change");
        cursor = builds.at(-1)?.id;
        hasNext = builds.length === chunkSize;
        const changedBuilds: typeof builds = [];

        for (const build of builds) {
          const buildId = build.id;
          try {
            let dataSourcesList: DataSourcesList = JSON.parse(
              build.dataSources
            );
            let propsList: PropsList = JSON.parse(build.props);

            let changed = false;

            const dataSources = new Map(
              dataSourcesList.map((dataSource) => [dataSource.id, dataSource])
            );

            // convert type=dataSource to type=expression
            propsList = propsList.map((prop) => {
              if (prop.type === "dataSource") {
                changed = true;

                const dataSourceId = prop.value;
                const dataSource = dataSources.get(dataSourceId);
                if (dataSource?.type === "variable") {
                  return {
                    ...prop,
                    type: "expression",
                    value: encodeDataSourceVariable(dataSourceId),
                  };
                }
                if (dataSource?.type === "expression") {
                  return {
                    ...prop,
                    type: "expression",
                    value: dataSource.code,
                  };
                }
              }
              return prop;
            });

            // delete all expression data sources
            dataSourcesList = dataSourcesList.filter((dataSource) => {
              if (dataSource.type === "variable") {
                changed = true;
                return true;
              }
              return false;
            });

            if (changed) {
              build.dataSources = JSON.stringify(dataSourcesList);
              build.props = JSON.stringify(propsList);
              changedBuilds.push(build);
            }
          } catch {
            console.info(`build ${buildId} cannot be converted`);
          }
        }
        console.timeEnd("parse-change");
        console.log("changedBuilds.length", changedBuilds.length);
        console.time("update");

        const sql = `
          UPDATE "Build"
          SET
            "props" = data."props",
            "dataSources" = data."dataSources"
          FROM unnest(ARRAY[$1], ARRAY[$2], ARRAY[$3]) as data(id, props, "dataSources")
          WHERE "Build"."id" = data."id"
        `;

        if (changedBuilds.length === 0) {
          return;
        }
        const res = await prisma.$executeRawUnsafe(
          sql,
          changedBuilds.map((changedBuild) => changedBuild.id),
          changedBuilds.map((changedBuild) => changedBuild.props),
          changedBuilds.map((changedBuild) => changedBuild.dataSources)
        );

        console.timeEnd("update");
        console.log("res", res);
      }
    },
    { timeout: 3600000 }
  );
};
