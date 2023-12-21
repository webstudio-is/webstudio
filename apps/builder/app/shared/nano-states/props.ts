import { computed } from "nanostores";
import {
  createScope,
  type DataSource,
  type Instance,
  type Page,
  type Prop,
} from "@webstudio-is/sdk";
import {
  collectionComponent,
  encodeDataSourceVariable,
  generateDataSources,
  normalizeProps,
} from "@webstudio-is/react-sdk";
import { $instances } from "./instances";
import {
  $dataSourceVariables,
  $dataSources,
  $props,
  $assets,
} from "./nano-states";
import { $selectedPage, $pages } from "./pages";
import { groupBy } from "../array-utils";
import type { InstanceSelector } from "../tree-utils";
import { $params } from "~/canvas/stores";

export const getIndexedInstanceId = (
  instanceId: Instance["id"],
  index: number
) => `${instanceId}[${index}]`;

// result of executing generated code
// includes variables, computed expressions and action callbacks
const $dataSourcesLogic = computed(
  [$dataSources, $dataSourceVariables, $props],
  (dataSources, dataSourceVariables, props) => {
    const scope = createScope(["_getVariable", "_setVariable", "_output"]);
    const { variables, body, output } = generateDataSources({
      scope,
      dataSources,
      props,
    });
    let generatedCode = "";
    // render state variables
    for (const [dataSourceId, variable] of variables) {
      const { valueName, setterName } = variable;
      const initialValue = JSON.stringify(variable.initialValue);
      generatedCode += `let ${valueName} = _getVariable("${dataSourceId}") ?? ${initialValue};\n`;
      generatedCode += `let ${setterName} = (value) => _setVariable("${dataSourceId}", value);\n`;
    }
    // render parameters
    for (const [dataSourceId, dataSource] of dataSources) {
      if (dataSource.type === "parameter") {
        const variableName = scope.getName(dataSourceId, dataSource.name);
        generatedCode += `let ${variableName} = _getVariable("${dataSourceId}");\n`;
      }
    }
    generatedCode += body;
    generatedCode += `let _output = new Map();\n`;
    for (const [dataSourceId, variableName] of output) {
      generatedCode += `_output.set('${dataSourceId}', ${variableName})\n`;
    }
    for (const [dataSourceId, dataSource] of dataSources) {
      if (dataSource.type === "parameter") {
        const variableName = scope.getName(dataSourceId, dataSource.name);
        generatedCode += `_output.set('${dataSourceId}', ${variableName})\n`;
      }
    }
    generatedCode += `return _output\n`;

    try {
      const executeFn = new Function(
        "_getVariable",
        "_setVariable",
        generatedCode
      );
      const getVariable = (id: string) => {
        return dataSourceVariables.get(id);
      };
      const setVariable = (id: string, value: unknown) => {
        const dataSourceVariables = new Map($dataSourceVariables.get());
        dataSourceVariables.set(id, value);
        $dataSourceVariables.set(dataSourceVariables);
      };
      return executeFn(getVariable, setVariable);
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error(error);
    }
    return new Map();
  }
);

const computeExpression = (
  expression: string,
  variables: Map<DataSource["id"], unknown>
) => {
  let code = "";
  for (const [id, value] of variables) {
    // @todo pass dedicated map of variables without actions
    // skip actions
    if (typeof value === "function") {
      continue;
    }
    const identifier = encodeDataSourceVariable(id);
    code += `const ${identifier} = ${JSON.stringify(value)};\n`;
  }
  code += `return (${expression})`;
  try {
    const result = new Function(code)();
    return result;
  } catch {
    // empty block
  }
};

const $pagesMap = computed($pages, (pages): Map<string, Page> => {
  if (pages === undefined) {
    return new Map();
  }
  return new Map(
    [pages.homePage, ...pages.pages].map((page) => [page.id, page])
  );
});

/**
 * compute prop values within context of instance ancestors
 * like a dry-run of rendering and accessing react contexts deep in the tree
 * essential to support collections which provide different values in each item
 * for same variables
 */
export const $propValuesByInstanceSelector = computed(
  [
    $instances,
    $props,
    $selectedPage,
    $dataSourcesLogic,
    $params,
    $pagesMap,
    $assets,
  ],
  (instances, props, page, dataSourcesLogic, params, pages, assets) => {
    const values = new Map<string, unknown>(dataSourcesLogic);

    let propsList = Array.from(props.values());
    // ignore asset and page props when params is not provided
    if (params) {
      // use whole props list to let access hash props from other pages and instances
      propsList = normalizeProps({
        props: propsList,
        assetBaseUrl: params.assetBaseUrl,
        assets,
        pages,
      });
    }
    // collect props and group by instances
    const propsByInstanceId = groupBy(propsList, (prop) => prop.instanceId);

    // traverse instances tree and compute props within each instance
    const propValuesByInstanceSelector = new Map<
      Instance["id"],
      Map<Prop["name"], unknown>
    >();
    if (page === undefined) {
      return propValuesByInstanceSelector;
    }
    const traverseInstances = (instanceSelector: InstanceSelector) => {
      const [instanceId] = instanceSelector;
      const instance = instances.get(instanceId);
      if (instance === undefined) {
        return;
      }

      const propValues = new Map<Prop["name"], unknown>();
      const props = propsByInstanceId.get(instanceId);
      const parameters = new Map<Prop["name"], DataSource["id"]>();
      if (props) {
        for (const prop of props) {
          // at this point asset and page either already converted to string
          // or can be ignored
          if (prop.type === "asset" || prop.type === "page") {
            continue;
          }
          if (prop.type === "expression") {
            const value = computeExpression(prop.value, values);
            if (value !== undefined) {
              propValues.set(prop.name, value);
            }
            continue;
          }
          if (prop.type === "action") {
            const action = values.get(prop.id);
            if (typeof action === "function") {
              propValues.set(prop.name, action);
            }
            continue;
          }
          if (prop.type === "parameter") {
            parameters.set(prop.name, prop.value);
            continue;
          }
          propValues.set(prop.name, prop.value);
        }
      }

      propValuesByInstanceSelector.set(
        JSON.stringify(instanceSelector),
        propValues
      );
      if (instance.component === collectionComponent) {
        const data = propValues.get("data");
        const itemVariableId = parameters.get("item");
        if (Array.isArray(data) && itemVariableId !== undefined) {
          data.forEach((item, index) => {
            values.set(itemVariableId, item);
            for (const child of instance.children) {
              if (child.type === "id") {
                const indexId = getIndexedInstanceId(instanceId, index);
                traverseInstances([child.value, indexId, ...instanceSelector]);
              }
            }
          });
        }
        return;
      }
      for (const child of instance.children) {
        if (child.type === "id") {
          traverseInstances([child.value, ...instanceSelector]);
        }
      }
    };
    traverseInstances([page.rootInstanceId]);
    return propValuesByInstanceSelector;
  }
);

export const $variableValuesByInstanceSelector = computed(
  [$instances, $props, $selectedPage, $dataSources, $dataSourceVariables],
  (instances, props, page, dataSources, dataSourceVariables) => {
    const propsByInstanceId = groupBy(
      props.values(),
      (prop) => prop.instanceId
    );

    const variablesByInstanceId = groupBy(
      dataSources.values(),
      (dataSource) => dataSource.scopeInstanceId
    );

    // traverse instances tree and compute props within each instance
    const variableValuesByInstanceSelector = new Map<
      Instance["id"],
      Map<Prop["name"], unknown>
    >();
    if (page === undefined) {
      return variableValuesByInstanceSelector;
    }
    const traverseInstances = (
      instanceSelector: InstanceSelector,
      parentVariableValues: Map<string, unknown>
    ) => {
      const [instanceId] = instanceSelector;
      const instance = instances.get(instanceId);
      if (instance === undefined) {
        return;
      }

      const variableValues = new Map<string, unknown>(parentVariableValues);
      variableValuesByInstanceSelector.set(
        JSON.stringify(instanceSelector),
        variableValues
      );
      const variables = variablesByInstanceId.get(instanceId);
      if (variables) {
        for (const variable of variables) {
          const value = dataSourceVariables.get(variable.id);
          if (variable.type === "variable") {
            variableValues.set(variable.id, value ?? variable.value.value);
          } else if (value !== undefined) {
            variableValues.set(variable.id, value);
          }
        }
      }

      const propValues = new Map<Prop["name"], unknown>();
      const props = propsByInstanceId.get(instanceId);
      const parameters = new Map<Prop["name"], DataSource["id"]>();
      if (props) {
        for (const prop of props) {
          if (
            prop.type === "asset" ||
            prop.type === "page" ||
            prop.type === "action"
          ) {
            continue;
          }
          if (prop.type === "expression") {
            const value = computeExpression(prop.value, variableValues);
            if (value !== undefined) {
              propValues.set(prop.name, value);
            }
            continue;
          }
          if (prop.type === "parameter") {
            parameters.set(prop.name, prop.value);
            continue;
          }
          propValues.set(prop.name, prop.value);
        }
      }

      if (instance.component === collectionComponent) {
        const data = propValues.get("data");
        const itemVariableId = parameters.get("item");
        if (Array.isArray(data) && itemVariableId !== undefined) {
          data.forEach((item, index) => {
            const itemVariableValues = new Map(variableValues);
            itemVariableValues.set(itemVariableId, item);
            for (const child of instance.children) {
              if (child.type === "id") {
                const indexId = getIndexedInstanceId(instanceId, index);
                traverseInstances(
                  [child.value, indexId, ...instanceSelector],
                  itemVariableValues
                );
              }
            }
          });
        }
        return;
      }
      for (const child of instance.children) {
        if (child.type === "id") {
          traverseInstances([child.value, ...instanceSelector], variableValues);
        }
      }
    };
    traverseInstances([page.rootInstanceId], new Map());
    return variableValuesByInstanceSelector;
  }
);
