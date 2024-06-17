import { atom, computed } from "nanostores";
import type {
  Resource,
  DataSource,
  Instance,
  Prop,
  ResourceRequest,
  System,
  ImageAsset,
} from "@webstudio-is/sdk";
import {
  decodeDataSourceVariable,
  encodeDataSourceVariable,
  transpileExpression,
} from "@webstudio-is/sdk";
import {
  collectionComponent,
  normalizeProps,
  portalComponent,
  textContentAttribute,
} from "@webstudio-is/react-sdk";
import { isFeatureEnabled } from "@webstudio-is/feature-flags";
import { mapGroupBy } from "~/shared/shim";
import { $instances } from "./instances";
import {
  $dataSources,
  $props,
  $assets,
  $resources,
  $uploadingFilesDataStore,
} from "./nano-states";
import { $selectedPage, $pages } from "./pages";
import type { InstanceSelector } from "../tree-utils";
import { $params } from "~/canvas/stores";
import { restResourcesLoader } from "../router-utils";
import {
  $dataSourceVariables,
  $resourceValues,
  $selectedPageDefaultSystem,
  mergeSystem,
} from "./variables";
import { uploadingFileDataToAsset } from "~/builder/shared/assets/asset-utils";

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
    assignersCode += transpileExpression({
      expression: value.code,
      executable: true,
      replaceVariable: (identifier, assignee) => {
        if (args?.includes(identifier)) {
          return;
        }
        const depId = decodeDataSourceVariable(identifier);
        if (depId) {
          getters.add(depId);
          if (assignee) {
            setters.add(depId);
          }
        }
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
    console.error(error);
  }
};

/**
 * values of all variables without computing scope specifics like collections
 * simplified version of variable values by instance selector
 */
const $unscopedVariableValues = computed(
  [
    $dataSources,
    $dataSourceVariables,
    $resourceValues,
    $selectedPage,
    $selectedPageDefaultSystem,
  ],
  (dataSources, dataSourceVariables, resourceValues, page, defaultSystem) => {
    const values = new Map<string, unknown>();
    for (const [dataSourceId, dataSource] of dataSources) {
      if (dataSource.type === "variable") {
        values.set(
          dataSourceId,
          dataSourceVariables.get(dataSourceId) ?? dataSource.value.value
        );
      }
      if (dataSource.type === "parameter") {
        let value = dataSourceVariables.get(dataSourceId);
        if (dataSource.id === page?.systemDataSourceId) {
          value = mergeSystem(defaultSystem, value as undefined | System);
        }
        values.set(dataSourceId, value);
      }
      if (dataSource.type === "resource") {
        values.set(dataSourceId, resourceValues.get(dataSource.resourceId));
      }
    }
    return values;
  }
);

const $selectedPageSystemId = computed(
  $selectedPage,
  (page) => page?.systemDataSourceId
);

/**
 * similar to above but should not depend on resource values
 * because these values are used to load resources
 * which result in updated resource values and may trigger
 * circular updates
 */
const $loaderVariableValues = computed(
  [
    $dataSources,
    $dataSourceVariables,
    $selectedPageSystemId,
    $selectedPageDefaultSystem,
  ],
  (dataSources, dataSourceVariables, systemId, defaultSystem) => {
    const values = new Map<string, unknown>();
    for (const [dataSourceId, dataSource] of dataSources) {
      if (dataSource.type === "variable") {
        values.set(
          dataSourceId,
          dataSourceVariables.get(dataSourceId) ?? dataSource.value.value
        );
      }
      if (dataSource.type === "parameter") {
        let value = dataSourceVariables.get(dataSourceId);
        if (dataSource.id === systemId) {
          value = mergeSystem(defaultSystem, value as undefined | System);
        }
        values.set(dataSourceId, value);
      }
    }
    return values;
  }
);

export const computeExpression = (
  expression: string,
  variables: Map<DataSource["id"], unknown>
) => {
  try {
    const usedVariables = new Map();
    const transpiled = transpileExpression({
      expression,
      executable: true,
      replaceVariable: (identifier) => {
        const id = decodeDataSourceVariable(identifier);
        if (id) {
          usedVariables.set(identifier, id);
        }
      },
    });
    let code = "";
    // add only used variables in expression and get values
    // from variables map without additional serializing of these values
    for (const [identifier, id] of usedVariables) {
      code += `let ${identifier} = _variables.get("${id}");\n`;
    }
    code += `return (${transpiled})`;
    const result = new Function("_variables", code)(variables);
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
    $unscopedVariableValues,
    $params,
    $pages,
    $assets,
    $uploadingFilesDataStore,
  ],
  (
    instances,
    props,
    page,
    unscopedVariableValues,
    params,
    pages,
    assets,
    uploadingFilesDataStore
  ) => {
    const variableValues = new Map<string, unknown>(unscopedVariableValues);

    let propsList = Array.from(props.values());

    // ignore asset and page props when params is not provided
    if (params && pages) {
      const uploadingImageAssets = uploadingFilesDataStore
        .map(uploadingFileDataToAsset)
        .filter(<T>(value: T): value is NonNullable<T> => value !== undefined)
        .filter((asset): asset is ImageAsset => asset.type === "image");

      // use whole props list to let access hash props from other pages and instances
      propsList = normalizeProps({
        props: propsList,
        assetBaseUrl: params.assetBaseUrl,
        assets,
        uploadingImageAssets,
        pages,
        source: "canvas",
      });
    }
    // collect props and group by instances
    const propsByInstanceId = mapGroupBy(propsList, (prop) => prop.instanceId);

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
          if (prop.type === "asset" && prop.name === "width") {
            const asset = assets.get(prop.value);
            if (asset?.type === "image") {
              propValues.set("width", asset.meta.width);
            }
          }

          if (prop.type === "asset" && prop.name === "height") {
            const asset = assets.get(prop.value);
            if (asset?.type === "image") {
              propValues.set("height", asset.meta.height);
            }
          }

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
    $selectedPageDefaultSystem,
  ],
  (
    instances,
    props,
    page,
    dataSources,
    dataSourceVariables,
    resourceValues,
    defaultSystem
  ) => {
    const propsByInstanceId = mapGroupBy(
      props.values(),
      (prop) => prop.instanceId
    );

    const variablesByInstanceId = mapGroupBy(
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
          if (
            variable.id === page.systemDataSourceId &&
            isFeatureEnabled("filters") === false
          ) {
            continue;
          }
          if (variable.type === "variable") {
            const value = dataSourceVariables.get(variable.id);
            variableValues.set(variable.id, value ?? variable.value.value);
          }
          if (variable.type === "parameter") {
            const value = dataSourceVariables.get(variable.id);
            variableValues.set(variable.id, value);
            if (variable.id === page.systemDataSourceId) {
              variableValues.set(
                variable.id,
                mergeSystem(defaultSystem, value as undefined | System)
              );
            }
          }
          if (variable.type === "resource") {
            const value = resourceValues.get(variable.resourceId);
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
        if (itemVariableId === undefined) {
          return;
        }
        // prevent accessing item from collection
        variableValues.delete(itemVariableId);
        if (Array.isArray(data)) {
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

const computeResource = (
  resource: Resource,
  values: Map<DataSource["id"], unknown>
): ResourceRequest => {
  const request: ResourceRequest = {
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
    request.body = computeExpression(resource.body, values);
  }
  return request;
};

const $computedResources = computed(
  [$resources, $loaderVariableValues],
  (resources, values) => {
    const computedResources: ResourceRequest[] = [];
    for (const resource of resources.values()) {
      computedResources.push(computeResource(resource, values));
    }
    return computedResources;
  }
);

const $resourcesLoadingCount = atom(0);
export const $areResourcesLoading = computed(
  $resourcesLoadingCount,
  (resourcesLoadingCount) => resourcesLoadingCount > 0
);

const loadResources = async (resourceRequests: ResourceRequest[]) => {
  $resourcesLoadingCount.set($resourcesLoadingCount.get() + 1);
  const response = await fetch(restResourcesLoader(), {
    method: "POST",
    body: JSON.stringify(resourceRequests),
  });
  $resourcesLoadingCount.set($resourcesLoadingCount.get() - 1);
  if (response.ok === false) {
    return new Map<Resource["id"], unknown>();
  }
  return new Map<Resource["id"], unknown>(await response.json());
};

const cacheByKeys = new Map<string, unknown>();

const $invalidator = atom(0);

export const getComputedResource = (resourceId: Resource["id"]) => {
  const resources = $resources.get();
  const resource = resources.get(resourceId);
  if (resource === undefined) {
    return;
  }
  const values = $loaderVariableValues.get();
  return computeResource(resource, values);
};

// bump index of resource to invaldate cache entry
export const invalidateResource = (resourceId: Resource["id"]) => {
  const request = getComputedResource(resourceId);
  if (request === undefined) {
    return;
  }
  const cacheKey = JSON.stringify(request);
  cacheByKeys.delete(cacheKey);
  // trigger invalidation
  $invalidator.set($invalidator.get() + 1);
};

/**
 * subscribe to all resources changes
 * load them with currently available variable values
 * and store in cache
 */
export const subscribeResources = () => {
  let frameId: undefined | number;
  // subscribe changing resources or global invalidation
  return computed(
    [$computedResources, $invalidator],
    (computedResources, invalidator) =>
      [computedResources, invalidator] as const
  ).subscribe(([computedResources]) => {
    if (frameId) {
      cancelAnimationFrame(frameId);
    }
    // batch updates into next frame
    // to avoid issues with untransactioned updates in nanostores
    frameId = requestAnimationFrame(async () => {
      const matched = new Map<Resource["id"], ResourceRequest>();
      const missing = new Map<Resource["id"], ResourceRequest>();
      for (const request of computedResources) {
        const cacheKey = JSON.stringify(request);
        if (cacheByKeys.has(cacheKey)) {
          matched.set(request.id, request);
        } else {
          missing.set(request.id, request);
        }
      }

      // preset undefined to prevent loading already requested data
      for (const request of missing.values()) {
        const cacheKey = JSON.stringify(request);
        cacheByKeys.set(cacheKey, undefined);
      }

      const result = await loadResources(Array.from(missing.values()));
      const newResourceValues = new Map();
      for (const request of computedResources) {
        const cacheKey = JSON.stringify(request);
        // read from cache or store in cache
        const response = result.get(request.id) ?? cacheByKeys.get(cacheKey);
        cacheByKeys.set(cacheKey, response);
        newResourceValues.set(request.id, response);
      }
      // update resource values only when new resources are loaded
      $resourceValues.set(newResourceValues);
    });
  });
};
