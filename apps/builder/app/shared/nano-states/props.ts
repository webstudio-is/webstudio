import { computed } from "nanostores";
import type { Resource, DataSource, Instance, Prop } from "@webstudio-is/sdk";
import {
  collectionComponent,
  decodeDataSourceVariable,
  encodeDataSourceVariable,
  normalizeProps,
  portalComponent,
  textContentAttribute,
  validateExpression,
} from "@webstudio-is/react-sdk";
import { $instances } from "./instances";
import {
  $dataSourceVariables,
  $dataSources,
  $props,
  $assets,
  $resources,
  $resourceValues,
} from "./nano-states";
import { $selectedPage, $pages } from "./pages";
import { groupBy } from "../array-utils";
import type { InstanceSelector } from "../tree-utils";
import { $params } from "~/canvas/stores";
import { restResourcesLoader } from "../router-utils";

export const getIndexedInstanceId = (
  instanceId: Instance["id"],
  index: number
) => `${instanceId}[${index}]`;

/**
 * (arg1) => {
 * let $ws$dataSource$id = _getVariable('id')
 * $ws$dataSource$id = $ws$dataSource$id + arg1
 * _setVariable('id', $ws$dataSource$id)
 * }
 */
const generateAction = (prop: Extract<Prop, { type: "action" }>) => {
  const getters = new Set<DataSource["id"]>();
  const setters = new Set<DataSource["id"]>();
  // important to fallback to empty argumets to render empty function
  let args: string[] = [];
  let assignersCode = "";
  for (const value of prop.value) {
    args = value.args;
    assignersCode += validateExpression(value.code, {
      optional: true,
      effectful: true,
      transformIdentifier: (identifier, assignee) => {
        if (args?.includes(identifier)) {
          return identifier;
        }
        const depId = decodeDataSourceVariable(identifier);
        if (depId) {
          getters.add(depId);
          if (assignee) {
            setters.add(depId);
          }
        }
        return identifier;
      },
    });
    assignersCode += `\n`;
  }
  let gettersCode = "";
  for (const dataSourceId of getters) {
    const valueName = encodeDataSourceVariable(dataSourceId);
    gettersCode += `let ${valueName} = _getVariable("${dataSourceId}")\n`;
  }
  let settersCode = "";
  for (const dataSourceId of setters) {
    const valueName = encodeDataSourceVariable(dataSourceId);
    settersCode += `_setVariable("${dataSourceId}", ${valueName})\n`;
  }
  let generated = "";
  generated += `return (${args.join(", ")}) => {\n`;
  generated += gettersCode;
  generated += assignersCode;
  generated += settersCode;
  generated += `}`;
  return generated;
};

const getAction = (
  prop: Extract<Prop, { type: "action" }>,
  values: Map<string, unknown>
) => {
  const generatedAction = generateAction(prop);
  try {
    const executeFn = new Function(
      "_getVariable",
      "_setVariable",
      generatedAction
    );
    const getVariable = (id: string) => {
      return values.get(id);
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
};

// result of executing generated code
// includes variables, computed expressions and action callbacks
const $dataSourcesLogic = computed(
  [$dataSources, $dataSourceVariables, $resourceValues],
  (dataSources, dataSourceVariables, resourceValues) => {
    const values = new Map<string, unknown>();
    for (const [dataSourceId, dataSource] of dataSources) {
      if (dataSource.type === "variable") {
        values.set(
          dataSourceId,
          dataSourceVariables.get(dataSourceId) ?? dataSource.value.value
        );
      }
      if (dataSource.type === "parameter") {
        values.set(dataSourceId, dataSourceVariables.get(dataSourceId));
      }
      if (dataSource.type === "resource") {
        values.set(dataSourceId, resourceValues.get(dataSource.resourceId));
      }
    }
    return values;
  }
);

const computeExpression = (
  expression: string,
  variables: Map<DataSource["id"], unknown>
) => {
  let code = "";
  for (const [id, value] of variables) {
    const identifier = encodeDataSourceVariable(id);
    code += `const ${identifier} = ${JSON.stringify(value)};\n`;
  }
  const transpiled = validateExpression(expression, {
    effectful: true,
    optional: true,
  });
  code += `return (${transpiled})`;
  try {
    const result = new Function(code)();
    return result;
  } catch {
    // empty block
  }
};

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
    $pages,
    $assets,
  ],
  (instances, props, page, dataSourcesLogic, params, pages, assets) => {
    const variableValues = new Map<string, unknown>(dataSourcesLogic);

    let propsList = Array.from(props.values());

    // ignore asset and page props when params is not provided
    if (params && pages) {
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
            const value = computeExpression(prop.value, variableValues);
            if (value !== undefined) {
              propValues.set(prop.name, value);
            }
            continue;
          }
          if (prop.type === "action") {
            const action = getAction(prop, variableValues);
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
            variableValues.set(itemVariableId, item);
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
        // plain text can be edited from props panel
        if (child.type === "text" && instance.children.length === 1) {
          propValues.set(textContentAttribute, child.value);
        }
        if (child.type === "expression") {
          const value = computeExpression(child.value, variableValues);
          if (value !== undefined) {
            propValues.set(textContentAttribute, value);
          }
        }
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
  [
    $instances,
    $props,
    $selectedPage,
    $dataSources,
    $dataSourceVariables,
    $resourceValues,
  ],
  (
    instances,
    props,
    page,
    dataSources,
    dataSourceVariables,
    resourceValues
  ) => {
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

      let variableValues = new Map<string, unknown>(parentVariableValues);
      variableValuesByInstanceSelector.set(
        JSON.stringify(instanceSelector),
        variableValues
      );
      const variables = variablesByInstanceId.get(instanceId);
      if (variables) {
        for (const variable of variables) {
          if (variable.type === "variable") {
            const value = dataSourceVariables.get(variable.id);
            variableValues.set(variable.id, value ?? variable.value.value);
          }
          if (variable.type === "parameter") {
            const value = dataSourceVariables.get(variable.id);
            if (value !== undefined) {
              variableValues.set(variable.id, value);
            }
          }
          if (variable.type === "resource") {
            const value = resourceValues.get(variable.resourceId);
            if (value !== undefined) {
              variableValues.set(variable.id, value);
            }
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
      // reset values for slot children to let slots behave as isolated components
      if (instance.component === portalComponent) {
        variableValues = new Map();
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

// resource loader do not have an access to other resources
const $loaderVariableValues = computed(
  [$dataSources, $dataSourceVariables],
  (dataSources, dataSourceVariables) => {
    const variableValues = new Map<string, unknown>();
    for (const variable of dataSources.values()) {
      if (variable.type === "variable") {
        const value = dataSourceVariables.get(variable.id);
        variableValues.set(variable.id, value ?? variable.value.value);
      }
      if (variable.type === "parameter") {
        const value = dataSourceVariables.get(variable.id);
        variableValues.set(variable.id, value);
      }
    }
    return variableValues;
  }
);

const $computedResources = computed(
  [$resources, $loaderVariableValues],
  (resources, values) => {
    const computedResources: Resource[] = [];
    for (const resource of resources.values()) {
      const data: Resource = {
        id: resource.id,
        name: resource.name,
        url: computeExpression(resource.url, values),
        method: resource.method,
        headers: resource.headers.map(({ name, value }) => ({
          name,
          value: computeExpression(value, values),
        })),
      };
      if (resource.body !== undefined) {
        data.body = computeExpression(resource.body, values);
      }
      computedResources.push(data);
    }
    return computedResources;
  }
);

let timeoutId: undefined | NodeJS.Timeout;
const scheduleLoading = (callback: () => Promise<void>) => {
  clearTimeout(timeoutId);
  timeoutId = setTimeout(callback, 1000);
};
const loadResources = async (resourceRequests: Resource[]) => {
  const response = await fetch(restResourcesLoader(), {
    method: "POST",
    body: JSON.stringify(resourceRequests),
  });
  if (response.ok === false) {
    return;
  }
  const result: [Resource["id"], unknown][] = await response.json();
  return result;
};

const cacheByKeys = new Map<string, unknown>();

/**
 * subscribe to all resources changes
 * load them with currently available variable values
 * and store in cache
 */
export const subscribeResources = () => {
  return $computedResources.subscribe((computedResources) => {
    const matched = new Map<Resource["id"], unknown>();
    const missing = new Map<Resource["id"], Resource>();
    for (const request of computedResources) {
      const key = JSON.stringify(request);
      if (cacheByKeys.has(key)) {
        matched.set(request.id, request);
      } else {
        missing.set(request.id, request);
      }
    }

    // update cached resource values
    if (matched.size !== 0) {
      const newResourceValues = new Map();
      for (const [id, request] of matched) {
        const response = cacheByKeys.get(JSON.stringify(request));
        newResourceValues.set(id, response);
      }
      $resourceValues.set(newResourceValues);
    }

    if (missing.size === 0) {
      return;
    }

    // load missing resource values
    scheduleLoading(async () => {
      // preset undefined to prevent loading already requested data
      for (const request of missing.values()) {
        cacheByKeys.set(JSON.stringify(request), undefined);
      }
      const result = await loadResources(Array.from(missing.values()));
      if (result === undefined) {
        return;
      }
      const newResourceValues = new Map($resourceValues.get());
      for (const [id, response] of result) {
        newResourceValues.set(id, response);
        // save in cache
        const request = missing.get(id);
        cacheByKeys.set(JSON.stringify(request), response);
      }
      $resourceValues.set(newResourceValues);
    });
  });
};
