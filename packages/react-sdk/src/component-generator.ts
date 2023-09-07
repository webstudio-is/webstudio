import type { Instances, Instance, Props } from "@webstudio-is/sdk";
import { findTreeInstanceIds } from "@webstudio-is/sdk";
import {
  componentAttribute,
  idAttribute,
  indexAttribute,
  showAttribute,
} from "./tree/webstudio-component";
import { encodeDataSourceVariable } from "./expression";
import type { IndexesWithinAncestors } from "./instance-utils";

/**
 * Namespaced components contain a lot of invalid characters for
 * js identifier
 * here normalized something like @webstudio-is/library:Box
 * to __webstudio__is__library__Box
 */
export const createComponentVariableName = (componentName: string) => {
  let normalized = componentName.replaceAll(/[^a-zA-Z0-9]/g, "__");
  if (normalized.startsWith("__") === false) {
    normalized = `__${normalized}`;
  }
  return normalized;
};

const encodePropVariable = (id: string) => {
  const encoded = id.replaceAll("-", "__DASH__");
  return `$ws$prop$${encoded}`;
};

export const generateJsxElement = ({
  instance,
  props,
  indexesWithinAncestors,
  children,
}: {
  instance: Instance;
  props: Props;
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
        conditionVariableName = encodeDataSourceVariable(dataSourceId);
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
      const dataSourceVariable = encodeDataSourceVariable(dataSourceId);
      generatedProps += `\n${prop.name}={${dataSourceVariable}}`;
      continue;
    }
    if (prop.type === "action") {
      const propVariable = encodePropVariable(prop.id);
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

  const componentVariable = createComponentVariableName(instance.component);
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
  children,
  instances,
  props,
  indexesWithinAncestors,
}: {
  children: Instance["children"];
  instances: Instances;
  props: Props;
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
        instance,
        props,
        indexesWithinAncestors,
        children: generateJsxChildren({
          children: instance.children,
          instances,
          props,
          indexesWithinAncestors,
        }),
      });
      continue;
    }
    child satisfies never;
  }
  return generatedChildren;
};

const generateDataSources = ({
  rootInstanceId,
  instances,
  props,
}: {
  rootInstanceId: Instance["id"];
  instances: Instances;
  props: Props;
}) => {
  let generatedDataSources = "";
  generatedDataSources += `const { dataSourceValuesStore, setDataSourceValues, executeEffectfulExpression } = useContext(ReactSdkContext);\n`;
  generatedDataSources +=
    "const dataSourceValues = useStore(dataSourceValuesStore);\n";
  const usedInstanceIds = findTreeInstanceIds(instances, rootInstanceId);
  for (const prop of props.values()) {
    if (prop.type === "dataSource" && usedInstanceIds.has(prop.instanceId)) {
      const dataSourceId = prop.value;
      const variableName = encodeDataSourceVariable(dataSourceId);
      const key = JSON.stringify(dataSourceId);
      generatedDataSources += `const ${variableName} = dataSourceValues.get(${key});\n`;
    }
    if (prop.type === "action") {
      const propVariable = encodePropVariable(prop.id);
      let args = "";
      for (const value of prop.value) {
        const newArgs = value.args.map((arg) => `${arg}: unknown`).join(", ");
        // skip execution when arguments do not match
        if (args !== "" && newArgs !== args) {
          console.error(
            `Action prop arguments do not match: "${args}" and "${newArgs}"`
          );
          continue;
        }
        args = newArgs;
      }
      generatedDataSources += `const ${propVariable} = (${args}) => {\n`;
      for (const value of prop.value) {
        if (value.type === "execute") {
          generatedDataSources += `const newValues = executeEffectfulExpression(\n`;
          generatedDataSources += `value.code,\n`;
          generatedDataSources += `new Map([`;
          generatedDataSources += value.args
            .map((arg) => `[${JSON.stringify(arg)}, ${arg}]`)
            .join(", ");
          generatedDataSources += `]),\n`;
          generatedDataSources += `dataSourceValues\n`;
          generatedDataSources += `);\n`;
          generatedDataSources += `setDataSourceValues(newValues);\n`;
        }
      }
      generatedDataSources += `};\n`;
    }
  }
  return generatedDataSources;
};

export const generatePageComponent = ({
  rootInstanceId,
  instances,
  props,
  indexesWithinAncestors,
}: {
  rootInstanceId: Instance["id"];
  instances: Instances;
  props: Props;
  indexesWithinAncestors: IndexesWithinAncestors;
}) => {
  const instance = instances.get(rootInstanceId);
  if (instance === undefined) {
    return "";
  }
  const generatedDataSources = generateDataSources({
    rootInstanceId,
    instances,
    props,
  });
  const generatedJsx = generateJsxElement({
    instance,
    props,
    indexesWithinAncestors,
    children:
      generateJsxChildren({
        children: instance.children,
        instances,
        props,
        indexesWithinAncestors,
      }) + "{props.scripts}\n",
  });

  let generatedComponent = "";
  generatedComponent += `export const Page = (props: { scripts: ReactNode }) => {\n`;
  generatedComponent += `${generatedDataSources}`;
  generatedComponent += `return ${generatedJsx}`;
  generatedComponent += `};\n`;
  return generatedComponent;
};
