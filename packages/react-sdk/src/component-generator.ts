import type {
  Instances,
  Instance,
  Props,
  Scope,
  DataSources,
  Prop,
  DataSource,
  WsComponentMeta,
  IndexesWithinAncestors,
  Resources,
} from "@webstudio-is/sdk";
import {
  parseComponentName,
  generateExpression,
  decodeDataSourceVariable,
  contentBlockDocumentProp,
  blockComponent,
  blockBodyComponent,
  blockTemplateComponent,
  collectionComponent,
  descendantComponent,
  getIndexesWithinAncestors,
  elementComponent,
} from "@webstudio-is/sdk";
import { transpileExpression } from "@webstudio-is/expression";
import { indexProperty, tagProperty } from "@webstudio-is/sdk/runtime";
import { getJsxPropName } from "@webstudio-is/content-engine/jsx-attributes";
import { isAttributeNameSafe, showAttribute } from "./props";
import { generateCollectionIterationCode } from "./collection-utils";

export type PublishedContentBlock = Readonly<{
  bodyInstanceId?: Instance["id"];
  sourceExpression?: string;
  candidates: readonly Readonly<{
    assetId: string;
    dependencyRevision: string;
    children: Instance["children"];
    frontmatter: Readonly<Record<string, unknown>>;
    resourceIds?: readonly string[];
  }>[];
}>;

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
    prop.type === "json" ||
    prop.type === "animationAction"
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
  if (prop.type === "resource") {
    return JSON.stringify(scope.getName(prop.value, prop.name));
  }
  prop satisfies never;
};

export const generateJsxElement = ({
  context = "jsx",
  scope,
  metas,
  tagsOverrides,
  instance,
  props,
  resources,
  dataSources,
  usedDataSources,
  indexesWithinAncestors,
  children,
  classesMap,
}: {
  context?: "expression" | "jsx";
  scope: Scope;
  metas: Map<Instance["component"], WsComponentMeta>;
  /**
   * Record<tag, componentDescriptor>
   */
  tagsOverrides?: Record<string, string>;
  instance: Instance;
  props: Props;
  resources?: Resources;
  dataSources: DataSources;
  usedDataSources: DataSources;
  indexesWithinAncestors: IndexesWithinAncestors;
  children: string;
  classesMap?: Map<string, Array<string>>;
}) => {
  // descendant component is used only for styling
  // and should not be rendered
  if (instance.component === descendantComponent) {
    return "";
  }

  const meta = metas.get(instance.component);
  const hasTags = Object.keys(meta?.presetStyle ?? {}).length > 0;

  let generatedProps = "";

  const index = indexesWithinAncestors.get(instance.id);
  if (index !== undefined) {
    generatedProps += `\n${indexProperty}="${index}"`;
  }
  if (instance.tag !== undefined && instance.component !== elementComponent) {
    generatedProps += `\n${tagProperty}=${JSON.stringify(instance.tag)}`;
  }

  let conditionValue: undefined | string;
  let collectionDataValue: undefined | string;
  let collectionItemValue: undefined | string;
  let collectionItemKeyValue: undefined | string;
  const classNameValues: string[] = [];
  const projectedResourceProps = new Map<string, unknown>();
  const componentPropNames = new Set(Object.keys(meta?.props ?? {}));
  const acceptsHtmlAttributes =
    hasTags ||
    instance.tag !== undefined ||
    instance.component === elementComponent;
  const getGeneratedPropName = (instancePropName: string) =>
    getJsxPropName({
      instancePropName,
      componentPropNames,
      acceptsHtmlAttributes,
    });
  // Older projects can contain duplicate props or both standard and React
  // aliases. Keep the last prop for each generated JSX name. Class aliases are
  // composable, so keep the last value for each alias and merge them below.
  const propsByGeneratedName = new Map<string, Prop>();
  const classProps = new Map<string, Prop>();
  for (const prop of props.values()) {
    if (
      prop.instanceId !== instance.id ||
      isAttributeNameSafe(prop.name) === false
    ) {
      continue;
    }
    const name = getGeneratedPropName(prop.name);
    if (name === "className") {
      classProps.set(prop.name, prop);
      continue;
    }
    propsByGeneratedName.set(name, prop);
  }
  const generatedPropNames = new Set([
    ...propsByGeneratedName.keys(),
    ...(classProps.size > 0 ? ["className"] : []),
  ]);

  for (const [name, prop] of [
    ...propsByGeneratedName,
    ...Array.from(classProps.values(), (prop) => ["className", prop] as const),
  ]) {
    const propValue = generatePropValue({
      scope,
      prop,
      dataSources,
      usedDataSources,
    });

    if (prop.type === "resource") {
      const propMeta = meta?.props?.[prop.name];
      const resource = resources?.get(prop.value);
      if (propMeta?.type === "resource" && resource !== undefined) {
        for (const propName of propMeta.generatedProps ?? []) {
          const generatedPropName = getGeneratedPropName(propName);
          if (
            generatedPropNames.has(generatedPropName) === false &&
            isAttributeNameSafe(propName)
          ) {
            projectedResourceProps.set(generatedPropName, resource[propName]);
          }
        }
      }
    }

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
      if (prop.name === "itemKey") {
        collectionItemKeyValue = propValue;
      }
      continue;
    }
    // Merge atomic classes with the JSX className produced by the shared
    // instance-to-JSX property adapter.
    if (name === "className" && propValue !== undefined) {
      classNameValues.push(propValue);
      continue;
    }
    if (propValue !== undefined) {
      generatedProps += `\n${name}={${propValue}}`;
    }
  }

  for (const [name, value] of projectedResourceProps) {
    generatedProps += `\n${name}={${JSON.stringify(value)}}`;
  }

  const classMapArray = classesMap?.get(instance.id);
  if (classMapArray || classNameValues.length > 0) {
    let classNameTemplate = classMapArray ? classMapArray.join(" ") : "";
    for (const classNameValue of classNameValues) {
      if (classNameTemplate) {
        classNameTemplate += " ";
      }
      classNameTemplate += "${" + classNameValue + "}";
    }
    // wrap class expression with template literal to properly group
    // for exaple expressions
    generatedProps += "\nclassName={`" + classNameTemplate + "`}";
  }

  let generatedElement = "";
  if (instance.component === blockTemplateComponent) {
    return "";
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
    // use itemKey prop if provided, otherwise use generated index variable
    const keyVariable = collectionItemKeyValue ?? indexVariable;
    // collection can be nullable or invalid type
    // fix implicitly on published sites
    // support both arrays and objects with Object.entries
    generatedElement += `{${generateCollectionIterationCode({
      dataExpression: collectionDataValue,
      keyVariable,
      itemVariable: collectionItemValue,
    })} (\n`;
    generatedElement += `<Fragment key={${keyVariable}}>\n`;
    generatedElement += children;
    generatedElement += `</Fragment>\n`;
    generatedElement += `)\n`;
    generatedElement += `})\n`;
    generatedElement += `}\n`;
  } else if (
    instance.component === blockComponent ||
    instance.component === blockBodyComponent
  ) {
    generatedElement += children;
  } else {
    let componentVariable;
    if (instance.component === elementComponent) {
      componentVariable = instance.tag === "" ? "div" : (instance.tag ?? "div");
      // replace html tag with component if available
      const componentDescriptor = tagsOverrides?.[componentVariable];
      if (componentDescriptor !== undefined) {
        const [_importSource, importSpecifier] = componentDescriptor.split(":");
        componentVariable = scope.getName(componentDescriptor, importSpecifier);
      }
    } else {
      const [_namespace, shortName] = parseComponentName(instance.component);
      componentVariable = scope.getName(instance.component, shortName);
    }
    if (instance.children.length === 0) {
      generatedElement += `<${componentVariable}${generatedProps} />\n`;
    } else {
      generatedElement += `<${componentVariable}${generatedProps}>\n`;
      generatedElement += children;
      generatedElement += `</${componentVariable}>\n`;
    }
  }

  // coditionally render instance when show prop is data source
  // {dataSourceVariable && <Instance>}
  if (conditionValue) {
    let conditionalElement = "";
    let before = "";
    let after = "";
    if (context === "jsx") {
      before = "{";
      after = "}";
    }
    conditionalElement += `${before}(${conditionValue}) &&\n`;
    // wrap collection with fragment when rendered inside condition
    // {dataSourceVariable &&
    //  <>
    //    {[].map(...)}
    //  </>
    // }
    if (instance.component === collectionComponent) {
      conditionalElement += "<>\n";
      conditionalElement += generatedElement;
      conditionalElement += "</>\n";
    } else {
      conditionalElement += generatedElement;
    }
    conditionalElement += `${after}\n`;
    return conditionalElement;
  }

  return generatedElement;
};

export const generateJsxChildren = ({
  scope,
  metas,
  tagsOverrides,
  children,
  instances,
  props,
  resources,
  dataSources,
  usedDataSources,
  indexesWithinAncestors,
  classesMap,
  excludePlaceholders,
  publishedContentBlocks,
  contentBodyOverride,
}: {
  scope: Scope;
  metas: Map<Instance["component"], WsComponentMeta>;
  // Record<tag, componentDescriptor>
  tagsOverrides?: Record<string, string>;
  children: Instance["children"];
  instances: Instances;
  props: Props;
  resources?: Resources;
  dataSources: DataSources;
  usedDataSources: DataSources;
  indexesWithinAncestors: IndexesWithinAncestors;
  classesMap?: Map<string, Array<string>>;
  excludePlaceholders?: boolean;
  publishedContentBlocks?: ReadonlyMap<Instance["id"], PublishedContentBlock>;
  contentBodyOverride?: Readonly<{
    instanceId: Instance["id"];
    children: Instance["children"];
  }>;
}) => {
  let generatedChildren = "";
  for (const child of children) {
    if (child.type === "text") {
      if (excludePlaceholders && child.placeholder === true) {
        continue;
      }
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
      generatedChildren += `{renderText(${expression})}\n`;
      continue;
    }
    if (child.type === "id") {
      const instanceId = child.value;
      const instance = instances.get(instanceId);
      if (instance === undefined) {
        continue;
      }
      const publishedContent = publishedContentBlocks?.get(instance.id);
      let generatedInstanceChildren: string;
      if (contentBodyOverride?.instanceId === instance.id) {
        generatedInstanceChildren = generateJsxChildren({
          classesMap,
          scope,
          metas,
          tagsOverrides,
          children: contentBodyOverride.children,
          instances,
          props,
          resources,
          dataSources,
          usedDataSources,
          indexesWithinAncestors,
          excludePlaceholders,
          publishedContentBlocks,
        });
      } else if (publishedContent === undefined) {
        generatedInstanceChildren = generateJsxChildren({
          classesMap,
          scope,
          metas,
          tagsOverrides,
          children: instance.children,
          instances,
          props,
          resources,
          dataSources,
          usedDataSources,
          indexesWithinAncestors,
          excludePlaceholders,
          publishedContentBlocks,
          contentBodyOverride,
        });
      } else {
        const sourceExpression =
          publishedContent.sourceExpression === undefined
            ? undefined
            : generateExpression({
                expression: publishedContent.sourceExpression,
                dataSources,
                usedDataSources,
                scope,
              });
        const documentParameter = Array.from(props.values()).find(
          (prop): prop is Extract<Prop, { type: "parameter" }> =>
            prop.instanceId === instance.id &&
            prop.name === contentBlockDocumentProp &&
            prop.type === "parameter"
        );
        const documentDataSource =
          documentParameter === undefined
            ? undefined
            : dataSources.get(documentParameter.value);
        if (documentDataSource !== undefined) {
          usedDataSources.set(documentDataSource.id, documentDataSource);
        }
        const documentName =
          documentDataSource === undefined
            ? undefined
            : scope.getName(documentDataSource.id, documentDataSource.name);
        const generatedCandidates = publishedContent.candidates.map(
          ({
            assetId,
            dependencyRevision,
            children: candidateChildren,
            frontmatter,
          }) => {
            const generated = generateJsxChildren({
              classesMap,
              scope,
              metas,
              tagsOverrides,
              children:
                publishedContent.bodyInstanceId === undefined
                  ? candidateChildren
                  : instance.children,
              instances,
              props,
              resources,
              dataSources,
              usedDataSources,
              indexesWithinAncestors,
              excludePlaceholders,
              publishedContentBlocks,
              contentBodyOverride:
                publishedContent.bodyInstanceId === undefined
                  ? undefined
                  : {
                      instanceId: publishedContent.bodyInstanceId,
                      children: candidateChildren,
                    },
            });
            const withDocument =
              documentName === undefined
                ? generated
                : `{((${documentName}) => <Fragment>\n${generated}</Fragment>)(${JSON.stringify({ frontmatter })})}\n`;
            return {
              assetId,
              dependencyRevision,
              generated: withDocument,
            };
          }
        );
        if (sourceExpression === undefined) {
          generatedInstanceChildren = generatedCandidates
            .map(
              ({ dependencyRevision, generated }) =>
                `<Fragment key=${JSON.stringify(dependencyRevision)}>\n${generated}</Fragment>\n`
            )
            .join("");
        } else {
          const sourceName = scope.getName(
            `${instance.id}-published-source`,
            "contentSource"
          );
          const branches = generatedCandidates
            .map(
              ({ assetId, dependencyRevision, generated }) =>
                `${sourceName} === ${JSON.stringify(assetId)} ? <Fragment key=${JSON.stringify(dependencyRevision)}>\n${generated}</Fragment>`
            )
            .join(" : ");
          generatedInstanceChildren = `{((${sourceName}) => ${
            branches.length === 0 ? "null" : `${branches} : null`
          })(${sourceExpression})}\n`;
        }
      }
      generatedChildren += generateJsxElement({
        context: "jsx",
        scope,
        metas,
        tagsOverrides,
        instance,
        props,
        resources,
        dataSources,
        usedDataSources,
        indexesWithinAncestors,
        classesMap,
        children: generatedInstanceChildren,
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
  resources,
  dataSources,
  metas,
  tagsOverrides,
  classesMap,
  publishedContentBlocks,
}: {
  scope: Scope;
  name: string;
  rootInstanceId: Instance["id"];
  parameters: Extract<Prop, { type: "parameter" }>[];
  instances: Instances;
  props: Props;
  resources?: Resources;
  dataSources: DataSources;
  classesMap: Map<string, Array<string>>;
  publishedContentBlocks?: ReadonlyMap<Instance["id"], PublishedContentBlock>;
  metas: Map<Instance["component"], WsComponentMeta>;
  /**
   * Record<tag, componentDescriptor>
   */
  tagsOverrides?: Record<string, string>;
}) => {
  const instance = instances.get(rootInstanceId);
  const indexesWithinAncestors = getIndexesWithinAncestors(metas, instances, [
    rootInstanceId,
  ]);

  const usedDataSources: DataSources = new Map();
  let generatedJsx = "<></>\n";
  // instance can be missing when generate xml
  if (instance) {
    generatedJsx = generateJsxElement({
      context: "expression",
      scope,
      metas,
      tagsOverrides,
      instance,
      props,
      resources,
      dataSources,
      usedDataSources,
      indexesWithinAncestors,
      classesMap,
      children: generateJsxChildren({
        scope,
        metas,
        tagsOverrides,
        children: instance.children,
        instances,
        props,
        resources,
        dataSources,
        usedDataSources,
        indexesWithinAncestors,
        classesMap,
        publishedContentBlocks,
      }),
    });
  }

  let generatedProps = "";
  let generatedParameters = "";
  const uniqueParameters = new Set(
    parameters.map((parameter) => parameter.name)
  );
  if (parameters.length > 0) {
    let generatedPropsType = "";
    for (const parameterName of uniqueParameters) {
      generatedPropsType += `${parameterName}: any; `;
    }
    generatedProps = `_props: { ${generatedPropsType}}`;
    for (const parameter of parameters) {
      const dataSource = usedDataSources.get(parameter.value);
      // always generate type and avoid generating value when unused
      if (dataSource) {
        const valueName = scope.getName(dataSource.id, dataSource.name);
        generatedParameters += `const ${valueName} = _props.${parameter.name};\n`;
      }
    }
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
      generatedDataSources += `let [${valueName}, ${setterName}] = useVariableState<any>(${initialValueString})\n`;
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
  generatedComponent += `${generatedParameters}`;
  generatedComponent += `${generatedDataSources}`;
  generatedComponent += `return ${generatedJsx}`;
  generatedComponent += `}\n`;
  return generatedComponent;
};
