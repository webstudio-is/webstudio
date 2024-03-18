import { z } from "zod";
import { nanoid } from "nanoid";
import { titleCase } from "title-case";
import { noCase } from "change-case";
import type {
  Instance,
  Prop,
  StyleSourceSelection,
  StyleSource,
  StyleDecl,
  Breakpoint,
  DataSource,
  WebstudioFragment,
} from "@webstudio-is/sdk";
import { StyleValue, type StyleProperty } from "@webstudio-is/css-engine";
import type { Simplify } from "type-fest";
import { encodeDataSourceVariable, transpileExpression } from "./expression";
import type { WsComponentMeta } from "./components/component-meta";

const EmbedTemplateText = z.object({
  type: z.literal("text"),
  value: z.string(),
});

type EmbedTemplateText = z.infer<typeof EmbedTemplateText>;

const EmbedTemplateExpression = z.object({
  type: z.literal("expression"),
  value: z.string(),
});

type EmbedTemplateExpression = z.infer<typeof EmbedTemplateExpression>;

const EmbedTemplateVariable = z.object({
  alias: z.optional(z.string()),
  initialValue: z.unknown(),
});

type EmbedTemplateVariable = z.infer<typeof EmbedTemplateVariable>;

export const EmbedTemplateProp = z.union([
  z.object({
    type: z.literal("number"),
    name: z.string(),
    value: z.number(),
  }),
  z.object({
    type: z.literal("string"),
    name: z.string(),
    value: z.string(),
  }),
  z.object({
    type: z.literal("boolean"),
    name: z.string(),
    value: z.boolean(),
  }),
  z.object({
    type: z.literal("string[]"),
    name: z.string(),
    value: z.array(z.string()),
  }),
  z.object({
    type: z.literal("json"),
    name: z.string(),
    value: z.unknown(),
  }),
  z.object({
    type: z.literal("expression"),
    name: z.string(),
    code: z.string(),
  }),
  z.object({
    type: z.literal("parameter"),
    name: z.string(),
    variableName: z.string(),
    variableAlias: z.optional(z.string()),
  }),
  z.object({
    type: z.literal("action"),
    name: z.string(),
    value: z.array(
      z.object({
        type: z.literal("execute"),
        args: z.optional(z.array(z.string())),
        code: z.string(),
      })
    ),
  }),
]);

export type EmbedTemplateProp = z.infer<typeof EmbedTemplateProp>;

const EmbedTemplateStyleDeclRaw = z.object({
  // State selector, e.g. :hover
  state: z.optional(z.string()),
  property: z.string(),
  value: StyleValue,
});

export type EmbedTemplateStyleDecl = Simplify<
  Omit<z.infer<typeof EmbedTemplateStyleDeclRaw>, "property"> & {
    property: StyleProperty;
  }
>;

export const EmbedTemplateStyleDecl =
  EmbedTemplateStyleDeclRaw as z.ZodType<EmbedTemplateStyleDecl>;

export type EmbedTemplateInstance = {
  type: "instance";
  component: string;
  label?: string;
  variables?: Record<string, EmbedTemplateVariable>;
  props?: EmbedTemplateProp[];
  tokens?: string[];
  styles?: EmbedTemplateStyleDecl[];
  children: Array<
    EmbedTemplateInstance | EmbedTemplateText | EmbedTemplateExpression
  >;
};

export const EmbedTemplateInstance: z.ZodType<EmbedTemplateInstance> = z.lazy(
  () =>
    z.object({
      type: z.literal("instance"),
      component: z.string(),
      label: z.optional(z.string()),
      variables: z.optional(z.record(z.string(), EmbedTemplateVariable)),
      props: z.optional(z.array(EmbedTemplateProp)),
      tokens: z.optional(z.array(z.string())),
      styles: z.optional(z.array(EmbedTemplateStyleDecl)),
      children: WsEmbedTemplate,
    })
);

export const WsEmbedTemplate = z.lazy(() =>
  z.array(
    z.union([EmbedTemplateInstance, EmbedTemplateText, EmbedTemplateExpression])
  )
);

export type WsEmbedTemplate = z.infer<typeof WsEmbedTemplate>;

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

      // convert tokens into style sources and styles
      if (item.tokens) {
        const meta = metas.get(item.component);
        if (meta?.presetTokens) {
          for (const name of item.tokens) {
            const tokenValue = meta.presetTokens[name];
            if (tokenValue) {
              const styleSourceId = `${item.component}:${name}`;
              styleSourceIds.push(styleSourceId);
              styleSources.push({
                type: "token",
                id: styleSourceId,
                name: titleCase(noCase(name)),
              });
              for (const styleDecl of tokenValue.styles) {
                styles.push({
                  breakpointId: defaultBreakpointId,
                  styleSourceId,
                  state: styleDecl.state,
                  property: styleDecl.property,
                  value: styleDecl.value,
                });
              }
            }
          }
        }
      }

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
  defaultBreakpointId: Breakpoint["id"],
  generateId: () => string = nanoid
): WebstudioFragment => {
  const instances: Instance[] = [];
  const props: Prop[] = [];
  const dataSourceByRef = new Map<string, DataSource>();
  const styleSourceSelections: StyleSourceSelection[] = [];
  const styleSources: StyleSource[] = [];
  const styles: StyleDecl[] = [];

  const children = createInstancesFromTemplate(
    treeTemplate,
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

  return {
    children,
    instances,
    props,
    dataSources: Array.from(dataSourceByRef.values()),
    styleSourceSelections,
    styleSources,
    styles,
    assets: [],
    breakpoints: [],
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

export const namespaceMeta = (
  meta: WsComponentMeta,
  namespace: string,
  components: Set<EmbedTemplateInstance["component"]>
) => {
  const newMeta = { ...meta };
  if (newMeta.requiredAncestors) {
    newMeta.requiredAncestors = newMeta.requiredAncestors.map((component) =>
      components.has(component) ? `${namespace}:${component}` : component
    );
  }
  if (newMeta.invalidAncestors) {
    newMeta.invalidAncestors = newMeta.invalidAncestors.map((component) =>
      components.has(component) ? `${namespace}:${component}` : component
    );
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
