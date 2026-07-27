import { transpileExpression } from "@webstudio-is/expression";
import type { DataSource, DataSources } from "./schema/data-sources";
import type { Scope } from "./scope";
import { ROOT_INSTANCE_ID } from "./instances-utils";

export const SYSTEM_VARIABLE_ID = ":system";

export const systemParameter: DataSource = {
  id: SYSTEM_VARIABLE_ID,
  scopeInstanceId: ROOT_INSTANCE_ID,
  type: "parameter",
  name: "system",
};

const dataSourceVariablePrefix = "$ws$dataSource$";

// Data source ids use nanoid's URL alphabet, which contains dashes. Encode
// dashes so the persisted id can be embedded in a valid JavaScript identifier.
export const encodeDataVariableId = (id: string) => {
  if (id === SYSTEM_VARIABLE_ID) {
    return "$ws$system";
  }
  const encoded = id.replaceAll("-", "__DASH__");
  return `${dataSourceVariablePrefix}${encoded}`;
};
export { encodeDataVariableId as encodeDataSourceVariable };

export const decodeDataVariableId = (name: string) => {
  if (name === "$ws$system") {
    return SYSTEM_VARIABLE_ID;
  }
  if (name.startsWith(dataSourceVariablePrefix)) {
    const encoded = name.slice(dataSourceVariablePrefix.length);
    return encoded.replaceAll("__DASH__", "-");
  }
  return;
};
export { decodeDataVariableId as decodeDataSourceVariable };

export const generateExpression = ({
  expression,
  dataSources,
  usedDataSources,
  scope,
}: {
  expression: string;
  dataSources: DataSources;
  usedDataSources: DataSources;
  scope: Scope;
}) =>
  transpileExpression({
    expression,
    executable: true,
    replaceVariable: (identifier) => {
      const depId = decodeDataVariableId(identifier);
      let dep = depId ? dataSources.get(depId) : undefined;
      if (depId === SYSTEM_VARIABLE_ID) {
        dep = systemParameter;
      }
      if (dep) {
        usedDataSources.set(dep.id, dep);
        return scope.getName(dep.id, dep.name);
      }
      return "undefined";
    },
  });

/** Execute a static expression generated and controlled by Webstudio. */
export const executeExpression = (expression: undefined | string) => {
  try {
    const fn = new Function(`return (${expression})`);
    return fn();
  } catch {
    // Invalid and non-static expressions have no value here.
  }
};
