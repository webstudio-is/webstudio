/* eslint no-console: ["error", { allow: ["time", "timeEnd"] }] */

import type { Instance } from "@webstudio-is/sdk";
import { breakCyclesMutable } from "../shared/graph-utils";

const parseCompactInstanceData = (serialized: string) => {
  const instances = JSON.parse(serialized) as Instance[];

  // @todo: Remove after measurements on real data
  console.time("breakCyclesMutable");
  breakCyclesMutable(instances, (node) => node.component === "Slot");
  console.timeEnd("breakCyclesMutable");

  return instances;
};

export const parseData = <Type extends { id: string }>(
  string: string
): Map<Type["id"], Type> => {
  const list = JSON.parse(string) as Type[];
  return new Map(list.map((item) => [item.id, item]));
};

export const parseInstanceData = (
  string: string
): Map<Instance["id"], Instance> => {
  const list = parseCompactInstanceData(string);
  return new Map(list.map((item) => [item.id, item]));
};

export const serializeData = <Type extends { id: string }>(
  data: Map<Type["id"], Type>
) => {
  const dataSourcesList: Type[] = Array.from(data.values());
  return JSON.stringify(dataSourcesList);
};

export const parseConfig = <Type>(string: string): Type => {
  return JSON.parse(string);
};

export const serializeConfig = <Type>(data: Type) => {
  return JSON.stringify(data);
};
