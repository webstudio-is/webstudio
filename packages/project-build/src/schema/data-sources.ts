import { z } from "zod";

const DataSourceId = z.string();

export const DataSource = z.union([
  z.object({
    id: DataSourceId,
    name: z.string(),
    type: z.literal("string"),
    defaultValue: z.string(),
  }),
  z.object({
    id: DataSourceId,
    name: z.string(),
    type: z.literal("boolean"),
    defaultValue: z.boolean(),
  }),
]);

export type DataSource = z.infer<typeof DataSource>;

export const DataSourcesList = z.array(DataSource);

export type DataSourcesList = z.infer<typeof DataSourcesList>;

export const DataSources = z.map(DataSourceId, DataSource);

export type DataSources = z.infer<typeof DataSources>;

export const parseDataSources = (dataSourcesString: string): DataSources => {
  const dataSourcesList = JSON.parse(dataSourcesString) as DataSourcesList;
  return new Map(
    dataSourcesList.map((dataSource) => [dataSource.id, dataSource])
  );
};

export const serializeDataSources = (dataSources: DataSources) => {
  const dataSourcesList: DataSourcesList = Array.from(dataSources.values());
  return JSON.stringify(dataSourcesList);
};
