// DEPRECATED: use parseData and serializeData from build.ts
import type { DataSource, DataSources } from "@webstudio-is/sdk";

export const parseDataSources = (dataSourcesString: string): DataSources => {
  const dataSourcesList = JSON.parse(dataSourcesString) as DataSource[];
  return new Map(
    dataSourcesList.map((dataSource) => [dataSource.id, dataSource])
  );
};

export const serializeDataSources = (dataSources: DataSources) => {
  const dataSourcesList: DataSource[] = Array.from(dataSources.values());
  return JSON.stringify(dataSourcesList);
};
