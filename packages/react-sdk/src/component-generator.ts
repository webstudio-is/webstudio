import type {
  Instances,
  Instance,
  Props,
  Scope,
  DataSources,
  Prop,
  DataSource,
} from "@webstudio-is/sdk";
import {
  parseComponentName,
  generateExpression,
  decodeDataSourceVariable,
  transpileExpression,
} from "@webstudio-is/sdk";
import {
  componentAttribute,
  idAttribute,
  indexAttribute,
  showAttribute,
} from "./props";
import { collectionComponent } from "./core-components";
import type { IndexesWithinAncestors } from "./instance-utils";

/**
 * (arg1) => {
 * myVar = myVar + arg1
 * set$myVar(myVar)
 * }
 */
const generateAction = ({
  scope,
  prop,
  dataSources,
  usedDataSources,
}: {
  scope: Scope;
  prop: Extract<Prop, { type: "action" }>;
  dataSources: DataSources;
  usedDataSources: DataSources;
}) => {
  const setters = new Set<DataSource>();
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
        const dep = depId ? dataSources.get(depId) : undefined;
        if (dep) {
          usedDataSources.set(dep.id, dep);
          if (assignee) {
            setters.add(dep);
          }
          const valueName = scope.getName(dep.id, dep.name);
          return valueName;
        }
        // eslint-disable-next-line no-console
        console.error(`Unknown dependency "${identifier}"`);
      },
    });
    assignersCode += `\n`;
  }
  let settersCode = "";
  for (const dataSource of setters) {
    const valueName = scope.getName(dataSource.id, dataSource.name);
    const setterName = scope.getName(
      `set$${dataSource.id}`,
      `set$${dataSource.name}`
    );
    settersCode += `${setterName}(${valueName})\n`;
  }
  const argsList = args.map((arg) => `${arg}: any`).join(", ");
  let generated = "";
  generated += `(${argsList}) => {\n`;
  generated += assignersCode;
  generated += settersCode;
  generated += `}`;
  return generated;
};

const generatePropValue = ({
  scope,
  prop,
  dataSources,
  usedDataSources,
}: {
  scope: Scope;
  prop: Prop;
  dataSources: DataSources;
  usedDataSources: DataSources;
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
    usedDataSources.set(dataSource.id, dataSource);
    return scope.getName(dataSource.id, dataSource.name);
  }
  // inline expression to safely use collection item
  if (prop.type === "expression") {
    return generateExpression({
      expression: prop.value,
      dataSources,
      usedDataSources,
      scope,
    });
  }
  if (prop.type === "action") {
    return generateAction({ scope, prop, dataSources, usedDataSources });
  }
  prop satisfies never;
};

export const generateJsxElement = ({
  scope,
  instance,
  props,
  dataSources,
  usedDataSources,
  indexesWithinAncestors,
  children,
  classesMap,
}: {
  scope: Scope;
  instance: Instance;
  props: Props;
  dataSources: DataSources;
  usedDataSources: DataSources;
  indexesWithinAncestors: IndexesWithinAncestors;
  children: string;
  classesMap?: Map<string, Array<string>>;
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

  const classes = Array.from(classesMap?.get(instance.id) ?? []);
  for (const prop of props.values()) {
    if (prop.instanceId !== instance.id) {
      continue;
    }
    const propValue = generatePropValue({
      scope,
      prop,
      dataSources,
      usedDataSources,
    });
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
    // We need to merge atomic classes with user-defined className prop.
    if (prop.name === "className") {
      if (prop.type === "string") {
        classes.push(prop.value);
      }
      continue;
    }
    if (propValue !== undefined) {
      generatedProps += `\n${prop.name}={${propValue}}`;
    }
  }

  if (classes.length !== 0) {
    generatedProps += `\nclassName=${JSON.stringify(classes.join(" "))}`;
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
  usedDataSources,
  indexesWithinAncestors,
  classesMap,
}: {
  scope: Scope;
  children: Instance["children"];
  instances: Instances;
  props: Props;
  dataSources: DataSources;
  usedDataSources: DataSources;
  indexesWithinAncestors: IndexesWithinAncestors;
  classesMap?: Map<string, Array<string>>;
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
    if (child.type === "expression") {
      const expression = generateExpression({
        expression: child.value,
        dataSources,
        usedDataSources,
        scope,
      });
      generatedChildren = `{${expression}}\n`;
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
        usedDataSources,
        indexesWithinAncestors,
        classesMap,
        children: generateJsxChildren({
          classesMap,
          scope,
          children: instance.children,
          instances,
          props,
          dataSources,
          usedDataSources,
          indexesWithinAncestors,
        }),
      });
      continue;
    }
    child satisfies never;
  }
  return generatedChildren;
};

export const generateWebstudioComponent = ({
  scope,
  name,
  rootInstanceId,
  parameters,
  instances,
  props,
  dataSources,
  indexesWithinAncestors,
  classesMap,
}: {
  scope: Scope;
  name: string;
  rootInstanceId: Instance["id"];
  parameters: Extract<Prop, { type: "parameter" }>[];
  instances: Instances;
  props: Props;
  dataSources: DataSources;
  indexesWithinAncestors: IndexesWithinAncestors;
  classesMap: Map<string, Array<string>>;
}) => {
  const instance = instances.get(rootInstanceId);
  if (instance === undefined) {
    return "";
  }

  const usedDataSources: DataSources = new Map();
  const generatedJsx = generateJsxElement({
    scope,
    instance,
    props,
    dataSources,
    usedDataSources,
    indexesWithinAncestors,
    classesMap,
    children: generateJsxChildren({
      scope,
      children: instance.children,
      instances,
      props,
      dataSources,
      usedDataSources,
      indexesWithinAncestors,
      classesMap,
    }),
  });

  let generatedProps = "";
  if (parameters.length > 0) {
    let generatedPropsValue = "{ ";
    let generatedPropsType = "{ ";
    for (const parameter of parameters) {
      const dataSource = usedDataSources.get(parameter.value);
      // always generate type and avoid generating value when unused
      if (dataSource) {
        const valueName = scope.getName(dataSource.id, dataSource.name);
        generatedPropsValue += `${parameter.name}: ${valueName}, `;
      }
      generatedPropsType += `${parameter.name}: any; `;
    }
    generatedPropsValue += `}`;
    generatedPropsType += `}`;
    generatedProps = `${generatedPropsValue}: ${generatedPropsType}`;
  }

  let generatedDataSources = "";
  for (const dataSource of usedDataSources.values()) {
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
    if (dataSource.type === "resource") {
      const valueName = scope.getName(dataSource.id, dataSource.name);
      // call resource by bound variable name
      const resourceName = scope.getName(
        dataSource.resourceId,
        dataSource.name
      );
      // cast to any to fix accessing fields from unknown error
      const resourceNameString = JSON.stringify(resourceName);
      generatedDataSources += `let ${valueName} = useResource(${resourceNameString})\n`;
    }
  }

  let generatedComponent = "";
  generatedComponent += `const ${name} = (${generatedProps}) => {\n`;
  generatedComponent += `${generatedDataSources}`;
  generatedComponent += `return ${generatedJsx}`;
  generatedComponent += `}\n`;
  return generatedComponent;
};
