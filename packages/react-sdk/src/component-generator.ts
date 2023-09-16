import type {
  Instances,
  Instance,
  Props,
  Scope,
  DataSources,
} from "@webstudio-is/sdk";
import { parseComponentName } from "@webstudio-is/sdk";
import {
  componentAttribute,
  idAttribute,
  indexAttribute,
  showAttribute,
} from "./tree/webstudio-component";
import { generateDataSources } from "./expression";
import type { IndexesWithinAncestors } from "./instance-utils";

export const generateJsxElement = ({
  scope,
  instance,
  props,
  dataSources,
  indexesWithinAncestors,
  children,
}: {
  scope: Scope;
  instance: Instance;
  props: Props;
  dataSources: DataSources;
  indexesWithinAncestors: IndexesWithinAncestors;
  children: string;
}) => {
  let conditionVariableName: undefined | string;

  let generatedProps = "";

  // id and component props are always defined for styles
  generatedProps += `\n${idAttribute}=${JSON.stringify(instance.id)}`;
  generatedProps += `\n${componentAttribute}=${JSON.stringify(
    instance.component
  )}`;
  const index = indexesWithinAncestors.get(instance.id);
  if (index !== undefined) {
    generatedProps += `\n${indexAttribute}="${index}"`;
  }

  for (const prop of props.values()) {
    if (prop.instanceId !== instance.id) {
      continue;
    }
    // show prop controls conditional rendering and need to be handled separately
    if (prop.name === showAttribute) {
      // prevent instance rendering when hidden
      if (prop.type === "boolean" && prop.value === false) {
        return "";
      }
      if (prop.type === "dataSource") {
        const dataSourceId = prop.value;
        const dataSource = dataSources.get(dataSourceId);
        if (dataSource === undefined) {
          continue;
        }
        conditionVariableName = scope.getName(dataSource.id, dataSource.name);
      }
      // ignore any other values
      continue;
    }
    if (
      prop.type === "string" ||
      prop.type === "number" ||
      prop.type === "boolean" ||
      prop.type === "string[]"
    ) {
      generatedProps += `\n${prop.name}={${JSON.stringify(prop.value)}}`;
      continue;
    }
    // ignore asset and page props which are handled by components internally
    if (prop.type === "asset" || prop.type === "page") {
      continue;
    }
    if (prop.type === "dataSource") {
      const dataSourceId = prop.value;
      const dataSource = dataSources.get(dataSourceId);
      if (dataSource === undefined) {
        continue;
      }
      const dataSourceVariable = scope.getName(dataSource.id, dataSource.name);
      generatedProps += `\n${prop.name}={${dataSourceVariable}}`;
      continue;
    }
    if (prop.type === "action") {
      const propVariable = scope.getName(prop.id, prop.name);
      generatedProps += `\n${prop.name}={${propVariable}}`;
      continue;
    }
    prop satisfies never;
  }

  let generatedElement = "";
  // coditionally render instance when show prop is data source
  // {dataSourceVariable && <Instance>}
  if (conditionVariableName) {
    generatedElement += `{${conditionVariableName} &&\n`;
  }

  const [_namespace, shortName] = parseComponentName(instance.component);
  const componentVariable = scope.getName(instance.component, shortName);
  if (instance.children.length === 0) {
    generatedElement += `<${componentVariable}${generatedProps} />\n`;
  } else {
    generatedElement += `<${componentVariable}${generatedProps}>\n`;
    generatedElement += children;
    generatedElement += `</${componentVariable}>\n`;
  }

  if (conditionVariableName) {
    generatedElement += `}\n`;
  }

  return generatedElement;
};

/**
 * Jsx element and children are generated separately to be able
 * to inject some scripts into Body if necessary
 */
export const generateJsxChildren = ({
  scope,
  children,
  instances,
  props,
  dataSources,
  indexesWithinAncestors,
}: {
  scope: Scope;
  children: Instance["children"];
  instances: Instances;
  props: Props;
  dataSources: DataSources;
  indexesWithinAncestors: IndexesWithinAncestors;
}) => {
  let generatedChildren = "";
  for (const child of children) {
    if (child.type === "text") {
      // instance text can contain newlines
      // convert them too <br> tag
      generatedChildren += child.value
        .split("\n")
        .map((line) => `{${JSON.stringify(line)}}\n`)
        .join(`<br />\n`);
      continue;
    }
    if (child.type === "id") {
      const instanceId = child.value;
      const instance = instances.get(instanceId);
      if (instance === undefined) {
        continue;
      }
      generatedChildren += generateJsxElement({
        scope,
        instance,
        props,
        dataSources,
        indexesWithinAncestors,
        children: generateJsxChildren({
          scope,
          children: instance.children,
          instances,
          props,
          dataSources,
          indexesWithinAncestors,
        }),
      });
      continue;
    }
    child satisfies never;
  }
  return generatedChildren;
};

export const generatePageComponent = ({
  scope,
  rootInstanceId,
  instances,
  props,
  dataSources,
  indexesWithinAncestors,
}: {
  scope: Scope;
  rootInstanceId: Instance["id"];
  instances: Instances;
  props: Props;
  dataSources: DataSources;
  indexesWithinAncestors: IndexesWithinAncestors;
}) => {
  const instance = instances.get(rootInstanceId);
  if (instance === undefined) {
    return "";
  }
  const { variables, body: dataSourcesBody } = generateDataSources({
    scope,
    dataSources,
    props,
  });
  let generatedDataSources = "";
  for (const { valueName, setterName, initialValue } of variables.values()) {
    const initialValueString = JSON.stringify(initialValue);
    generatedDataSources += `let [${valueName}, ${setterName}] = useState(${initialValueString})\n`;
  }
  generatedDataSources += dataSourcesBody;

  const generatedJsx = generateJsxElement({
    scope,
    instance,
    props,
    dataSources,
    indexesWithinAncestors,
    children:
      generateJsxChildren({
        scope,
        children: instance.children,
        instances,
        props,
        dataSources,
        indexesWithinAncestors,
      }) + "{props.scripts}\n",
  });

  let generatedComponent = "";
  generatedComponent += `export const Page = (props: { scripts: ReactNode }) => {\n`;
  generatedComponent += `${generatedDataSources}`;
  generatedComponent += `return ${generatedJsx}`;
  generatedComponent += `}\n`;
  return generatedComponent;
};
