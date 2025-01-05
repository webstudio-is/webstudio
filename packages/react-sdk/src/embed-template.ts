import { nanoid } from "nanoid";
import type {
  Instance,
  Prop,
  StyleSourceSelection,
  StyleSource,
  StyleDecl,
  Breakpoint,
  DataSource,
  WebstudioFragment,
  Matcher,
  EmbedTemplateVariable,
  WsEmbedTemplate,
  EmbedTemplateInstance,
  WsComponentMeta,
} from "@webstudio-is/sdk";
import {
  encodeDataSourceVariable,
  transpileExpression,
} from "@webstudio-is/sdk";

const getVariablValue = (
  value: EmbedTemplateVariable["initialValue"]
): Extract<DataSource, { type: "variable" }>["value"] => {
  if (typeof value === "string") {
    return { type: "string", value };
  }
  if (typeof value === "number") {
    return { type: "number", value };
  }
  if (typeof value === "boolean") {
    return { type: "boolean", value };
  }
  if (Array.isArray(value)) {
    return { type: "string[]", value };
  }
  return { type: "json", value };
};

const createInstancesFromTemplate = (
  treeTemplate: WsEmbedTemplate,
  instances: Instance[],
  props: Prop[],
  dataSourceByRef: Map<string, DataSource>,
  styleSourceSelections: StyleSourceSelection[],
  styleSources: StyleSource[],
  styles: StyleDecl[],
  metas: Map<Instance["component"], WsComponentMeta>,
  defaultBreakpointId: Breakpoint["id"],
  generateId: () => string
) => {
  const parentChildren: Instance["children"] = [];
  for (const item of treeTemplate) {
    if (item.type === "instance") {
      const instanceId = generateId();

      if (item.variables) {
        for (const [name, variable] of Object.entries(item.variables)) {
          if (dataSourceByRef.has(name)) {
            throw Error(`${name} data source already defined`);
          }
          dataSourceByRef.set(name, {
            type: "variable",
            id: generateId(),
            scopeInstanceId: instanceId,
            name: variable.alias ?? name,
            value: getVariablValue(variable.initialValue),
          });
        }
      }

      // populate props
      if (item.props) {
        for (const prop of item.props) {
          const propId = generateId();

          if (prop.type === "expression") {
            props.push({
              id: propId,
              instanceId,
              name: prop.name,
              type: "expression",
              // replace all references with variable names
              value: transpileExpression({
                expression: prop.code,
                replaceVariable: (ref) => {
                  const id = dataSourceByRef.get(ref)?.id ?? ref;
                  return encodeDataSourceVariable(id);
                },
              }),
            });
            continue;
          }

          // action cannot be bound to data source
          if (prop.type === "action") {
            props.push({
              id: propId,
              instanceId,
              type: "action",
              name: prop.name,
              value: prop.value.map((value) => {
                const args = value.args ?? [];
                return {
                  type: "execute",
                  args,
                  // replace all references with variable names
                  code: transpileExpression({
                    expression: value.code,
                    replaceVariable: (ref) => {
                      // bypass arguments without changes
                      if (args.includes(ref)) {
                        return;
                      }
                      const id = dataSourceByRef.get(ref)?.id ?? ref;
                      return encodeDataSourceVariable(id);
                    },
                  }),
                };
              }),
            });
            continue;
          }

          if (prop.type === "parameter") {
            const dataSourceId = generateId();
            // generate data sources implicitly
            dataSourceByRef.set(prop.variableName, {
              type: "parameter",
              id: dataSourceId,
              scopeInstanceId: instanceId,
              name: prop.variableAlias ?? prop.variableName,
            });
            props.push({
              id: propId,
              instanceId,
              name: prop.name,
              type: "parameter",
              // replace variable reference with variable id
              value: dataSourceId,
            });
            continue;
          }

          props.push({ id: propId, instanceId, ...prop });
        }
      }

      const styleSourceIds: string[] = [];

      // populate styles
      if (item.styles) {
        const styleSourceId = generateId();
        styleSources.push({
          type: "local",
          id: styleSourceId,
        });
        // always put local style source last
        styleSourceIds.push(styleSourceId);
        for (const styleDecl of item.styles) {
          styles.push({
            breakpointId: defaultBreakpointId,
            styleSourceId,
            state: styleDecl.state,
            property: styleDecl.property,
            value: styleDecl.value,
          });
        }
      }

      if (styleSourceIds.length > 0) {
        styleSourceSelections.push({
          instanceId,
          values: styleSourceIds,
        });
      }

      // populate instances
      const instance: Instance = {
        type: "instance",
        id: instanceId,
        label: item.label,
        component: item.component,
        children: [],
      };
      instances.push(instance);
      // traverse children after to preserve top down order
      instance.children = createInstancesFromTemplate(
        item.children,
        instances,
        props,
        dataSourceByRef,
        styleSourceSelections,
        styleSources,
        styles,
        metas,
        defaultBreakpointId,
        generateId
      );
      parentChildren.push({
        type: "id",
        value: instanceId,
      });
    }

    if (item.type === "text") {
      parentChildren.push({
        type: "text",
        value: item.value,
        placeholder: item.placeholder,
      });
    }

    if (item.type === "expression") {
      parentChildren.push({
        type: "expression",
        // replace all references with variable names
        value: transpileExpression({
          expression: item.value,
          replaceVariable: (ref) => {
            const id = dataSourceByRef.get(ref)?.id ?? ref;
            return encodeDataSourceVariable(id);
          },
        }),
      });
    }
  }
  return parentChildren;
};

export const generateDataFromEmbedTemplate = (
  treeTemplate: WsEmbedTemplate,
  metas: Map<Instance["component"], WsComponentMeta>,
  generateId: () => string = nanoid
): WebstudioFragment => {
  const instances: Instance[] = [];
  const props: Prop[] = [];
  const dataSourceByRef = new Map<string, DataSource>();
  const styleSourceSelections: StyleSourceSelection[] = [];
  const styleSources: StyleSource[] = [];
  const styles: StyleDecl[] = [];
  const baseBreakpointId = generateId();

  const children = createInstancesFromTemplate(
    treeTemplate,
    instances,
    props,
    dataSourceByRef,
    styleSourceSelections,
    styleSources,
    styles,
    metas,
    baseBreakpointId,
    generateId
  );
  const breakpoints: Breakpoint[] = [];
  // will be merged into project base breakpoint
  if (styles.length > 0) {
    breakpoints.push({
      id: baseBreakpointId,
      label: "",
    });
  }

  return {
    children,
    instances,
    props,
    dataSources: Array.from(dataSourceByRef.values()),
    styleSourceSelections,
    styleSources,
    styles,
    breakpoints,
    assets: [],
    resources: [],
  };
};

const namespaceEmbedTemplateComponents = (
  template: WsEmbedTemplate,
  namespace: string,
  components: Set<EmbedTemplateInstance["component"]>
): WsEmbedTemplate => {
  return template.map((item) => {
    if (item.type === "text") {
      return item;
    }
    if (item.type === "expression") {
      return item;
    }
    if (item.type === "instance") {
      const prefix = components.has(item.component) ? `${namespace}:` : "";
      return {
        ...item,
        component: `${prefix}${item.component}`,
        children: namespaceEmbedTemplateComponents(
          item.children,
          namespace,
          components
        ),
      };
    }
    item satisfies never;
    throw Error("Impossible case");
  });
};

const namespaceMatcher = (namespace: string, matcher: Matcher) => {
  const newMatcher = structuredClone(matcher);
  if (newMatcher.component?.$eq) {
    newMatcher.component.$eq = `${namespace}:${newMatcher.component.$eq}`;
  }
  if (newMatcher.component?.$neq) {
    newMatcher.component.$neq = `${namespace}:${newMatcher.component.$neq}`;
  }
  if (newMatcher.component?.$in) {
    newMatcher.component.$in = newMatcher.component.$in.map(
      (component) => `${namespace}:${component}`
    );
  }
  if (newMatcher.component?.$nin) {
    newMatcher.component.$nin = newMatcher.component.$nin.map(
      (component) => `${namespace}:${component}`
    );
  }
  return newMatcher;
};

export const namespaceMeta = (
  meta: WsComponentMeta,
  namespace: string,
  components: Set<EmbedTemplateInstance["component"]>
) => {
  const newMeta = { ...meta };
  if (newMeta.constraints) {
    if (Array.isArray(newMeta.constraints)) {
      newMeta.constraints = newMeta.constraints.map((matcher) =>
        namespaceMatcher(namespace, matcher)
      );
    } else {
      newMeta.constraints = namespaceMatcher(namespace, newMeta.constraints);
    }
  }
  if (newMeta.indexWithinAncestor) {
    newMeta.indexWithinAncestor = components.has(newMeta.indexWithinAncestor)
      ? `${namespace}:${newMeta.indexWithinAncestor}`
      : newMeta.indexWithinAncestor;
  }
  if (newMeta.template) {
    newMeta.template = namespaceEmbedTemplateComponents(
      newMeta.template,
      namespace,
      components
    );
  }
  return newMeta;
};
