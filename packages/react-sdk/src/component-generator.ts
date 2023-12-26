import type {
  Instances,
  Instance,
  Props,
  Scope,
  DataSources,
  Prop,
  Page,
} from "@webstudio-is/sdk";
import { parseComponentName } from "@webstudio-is/sdk";
import {
  componentAttribute,
  idAttribute,
  indexAttribute,
  showAttribute,
} from "./props";
import { collectionComponent } from "./core-components";
import { generateExpression, generateDataSources } from "./expression";
import type { IndexesWithinAncestors } from "./instance-utils";

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
    return generateExpression({
      expression: prop.value,
      dataSources,
      scope,
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
    // fix implicit any error
    generatedElement += `{${collectionDataValue}?.map((${collectionItemValue}: any, ${indexVariable}: number) =>\n`;
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
  page,
  instances,
  props,
  dataSources,
  indexesWithinAncestors,
}: {
  scope: Scope;
  page: Page;
  instances: Instances;
  props: Props;
  dataSources: DataSources;
  indexesWithinAncestors: IndexesWithinAncestors;
}) => {
  const instance = instances.get(page.rootInstanceId);
  if (instance === undefined) {
    return "";
  }
  const { body: dataSourcesBody } = generateDataSources({
    typed: true,
    scope,
    dataSources,
    props,
  });
  let generatedDataSources = "";
  for (const dataSource of dataSources.values()) {
    if (dataSource.type === "variable") {
      const valueName = scope.getName(dataSource.id, dataSource.name);
      const setterName = scope.getName(
        `set$${dataSource.id}`,
        `set$${dataSource.name}`
      );
      const initialValue = dataSource.value.value;
      const initialValueString = JSON.stringify(initialValue);
      generatedDataSources += `let [${valueName}, ${setterName}] = useState<any>(${initialValueString})\n`;
    }
    if (dataSource.type === "parameter") {
      if (dataSource.id === page.pathVariableId) {
        const valueName = scope.getName(dataSource.id, dataSource.name);
        generatedDataSources += `let ${valueName} = _props.params\n`;
      }
    }
    if (dataSource.type === "resource") {
      const valueName = scope.getName(dataSource.id, dataSource.name);
      // call resource by bound variable name
      const resourceName = scope.getName(
        dataSource.resourceId,
        dataSource.name
      );
      // cast to any to fix accessing fields from unknown error
      generatedDataSources += `let ${valueName}: any = _props.resources["${resourceName}"]\n`;
    }
  }

  generatedDataSources += dataSourcesBody;

  const generatedJsx = generateJsxElement({
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

  let generatedComponent = "";
  generatedComponent += `type Params = Record<string, string | undefined>\n`;
  generatedComponent += `type Resources = Record<string, unknown>\n`;
  generatedComponent += `const Page = (_props: { params: Params, resources: Resources }) => {\n`;
  generatedComponent += `${generatedDataSources}`;
  generatedComponent += `return ${generatedJsx}`;
  generatedComponent += `}\n`;
  return generatedComponent;
};
