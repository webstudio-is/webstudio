import type {
  Instances,
  Instance,
  Props,
  Scope,
  DataSources,
  Prop,
} from "@webstudio-is/sdk";
import { parseComponentName } from "@webstudio-is/sdk";
import {
  componentAttribute,
  idAttribute,
  indexAttribute,
  showAttribute,
} from "./tree/webstudio-component";
import {
  decodeDataSourceVariable,
  generateDataSources,
  validateExpression,
} from "./expression";
import type { IndexesWithinAncestors } from "./instance-utils";
import { collectionComponent } from "./core-components";

const generatePropValue = ({
  scope,
  prop,
  dataSources,
}: {
  scope: Scope;
  prop: Prop;
  dataSources: DataSources;
}) => {
  // ignore asset and page props which are handled by components internally
  if (prop.type === "asset" || prop.type === "page") {
    return;
  }
  if (
    prop.type === "string" ||
    prop.type === "number" ||
    prop.type === "boolean" ||
    prop.type === "string[]" ||
    prop.type === "json"
  ) {
    return JSON.stringify(prop.value);
  }
  // generate variable name for parameter
  if (prop.type === "parameter") {
    const dataSource = dataSources.get(prop.value);
    if (dataSource === undefined) {
      return;
    }
    return scope.getName(dataSource.id, dataSource.name);
  }
  // inline expression to safely use collection item
  if (prop.type === "expression") {
    return validateExpression(prop.value, {
      // transpile to safely executable member expressions
      optional: true,
      transformIdentifier: (identifier) => {
        const depId = decodeDataSourceVariable(identifier);
        const dep = depId ? dataSources.get(depId) : undefined;
        if (dep) {
          return scope.getName(dep.id, dep.name);
        }
        return identifier;
      },
    });
  }
  if (prop.type === "action") {
    return scope.getName(prop.id, prop.name);
  }
  prop satisfies never;
};

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

  let conditionValue: undefined | string;
  let collectionDataValue: undefined | string;
  let collectionItemValue: undefined | string;
  for (const prop of props.values()) {
    if (prop.instanceId !== instance.id) {
      continue;
    }
    const propValue = generatePropValue({ scope, prop, dataSources });
    // show prop controls conditional rendering and need to be handled separately
    if (prop.name === showAttribute) {
      // prevent generating unnecessary condition
      if (propValue === "true") {
        continue;
      }
      // prevent instance rendering when always hidden
      if (propValue === "false") {
        return "";
      }
      conditionValue = propValue;
      // generate separately
      continue;
    }
    if (instance.component === collectionComponent) {
      if (prop.name === "data") {
        collectionDataValue = propValue;
      }
      if (prop.name === "item") {
        collectionItemValue = propValue;
      }
      continue;
    }
    if (propValue !== undefined) {
      generatedProps += `\n${prop.name}={${propValue}}`;
    }
  }

  let generatedElement = "";
  // coditionally render instance when show prop is data source
  // {dataSourceVariable && <Instance>}
  if (conditionValue) {
    generatedElement += `{(${conditionValue}) &&\n`;
  }

  if (instance.component === collectionComponent) {
    // prevent generating invalid collection
    if (
      collectionDataValue === undefined ||
      collectionItemValue === undefined
    ) {
      return "";
    }
    const indexVariable = scope.getName(`${instance.id}-index`, "index");
    generatedElement += `{${collectionDataValue}.map((${collectionItemValue}, ${indexVariable}) =>\n`;
    generatedElement += `<Fragment key={${indexVariable}}>\n`;
    generatedElement += children;
    generatedElement += `</Fragment>\n`;
    generatedElement += `)}\n`;
  } else {
    const [_namespace, shortName] = parseComponentName(instance.component);
    const componentVariable = scope.getName(instance.component, shortName);
    if (instance.children.length === 0) {
      generatedElement += `<${componentVariable}${generatedProps} />\n`;
    } else {
      generatedElement += `<${componentVariable}${generatedProps}>\n`;
      generatedElement += children;
      generatedElement += `</${componentVariable}>\n`;
    }
  }

  if (conditionValue) {
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
    typed: true,
    scope,
    dataSources,
    props,
  });
  let generatedDataSources = "";
  for (const { valueName, setterName, initialValue } of variables.values()) {
    const initialValueString = JSON.stringify(initialValue);
    generatedDataSources += `let [${valueName}, ${setterName}] = useState<any>(${initialValueString})\n`;
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
  generatedComponent += `const Page = (props: { scripts?: ReactNode }) => {\n`;
  generatedComponent += `${generatedDataSources}`;
  generatedComponent += `return ${generatedJsx}`;
  generatedComponent += `}\n`;
  return generatedComponent;
};
