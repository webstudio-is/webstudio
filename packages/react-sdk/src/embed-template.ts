import { z } from "zod";
import { nanoid } from "nanoid";
import { titleCase } from "title-case";
import { noCase } from "no-case";
import type {
  Instance,
  Prop,
  StyleSourceSelection,
  StyleSource,
  StyleDecl,
  Breakpoint,
  DataSource,
} from "@webstudio-is/sdk";
import { StyleValue, type StyleProperty } from "@webstudio-is/css-data";
import type { Simplify } from "type-fest";
import { encodeDataSourceVariable, validateExpression } from "./expression";
import type { WsComponentMeta } from "./components/component-meta";

const EmbedTemplateText = z.object({
  type: z.literal("text"),
  value: z.string(),
});

type EmbedTemplateText = z.infer<typeof EmbedTemplateText>;

const EmbedTemplateDataSource = z.union([
  z.object({
    type: z.literal("variable"),
    initialValue: z.union([
      z.string(),
      z.number(),
      z.boolean(),
      z.array(z.string()),
    ]),
  }),
  z.object({
    type: z.literal("expression"),
    code: z.string(),
  }),
]);

type EmbedTemplateDataSource = z.infer<typeof EmbedTemplateDataSource>;

const EmbedTemplateProp = z.union([
  z.object({
    type: z.literal("dataSource"),
    name: z.string(),
    dataSourceName: z.string(),
  }),
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

type EmbedTemplateProp = z.infer<typeof EmbedTemplateProp>;

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
  dataSources?: Record<string, EmbedTemplateDataSource>;
  props?: EmbedTemplateProp[];
  tokens?: string[];
  styles?: EmbedTemplateStyleDecl[];
  children: Array<EmbedTemplateInstance | EmbedTemplateText>;
};

export const EmbedTemplateInstance: z.ZodType<EmbedTemplateInstance> = z.lazy(
  () =>
    z.object({
      type: z.literal("instance"),
      component: z.string(),
      label: z.optional(z.string()),
      dataSources: z.optional(z.record(z.string(), EmbedTemplateDataSource)),
      props: z.optional(z.array(EmbedTemplateProp)),
      tokens: z.optional(z.array(z.string())),
      styles: z.optional(z.array(EmbedTemplateStyleDecl)),
      children: WsEmbedTemplate,
    })
);

export const WsEmbedTemplate = z.lazy(() =>
  z.array(z.union([EmbedTemplateInstance, EmbedTemplateText]))
);

export type WsEmbedTemplate = z.infer<typeof WsEmbedTemplate>;

const getDataSourceValue = (
  value: Extract<EmbedTemplateDataSource, { type: "variable" }>["initialValue"]
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
  value satisfies never;
  throw Error("Impossible case");
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
  defaultBreakpointId: Breakpoint["id"]
) => {
  const parentChildren: Instance["children"] = [];
  for (const item of treeTemplate) {
    if (item.type === "instance") {
      const instanceId = nanoid();

      if (item.dataSources) {
        for (const [name, dataSource] of Object.entries(item.dataSources)) {
          if (dataSourceByRef.has(name)) {
            throw Error(`${name} data source already defined`);
          }
          if (dataSource.type === "variable") {
            dataSourceByRef.set(name, {
              type: "variable",
              id: nanoid(),
              scopeInstanceId: instanceId,
              name,
              value: getDataSourceValue(dataSource.initialValue),
            });
          }
          if (dataSource.type === "expression") {
            dataSourceByRef.set(name, {
              type: "expression",
              id: nanoid(),
              scopeInstanceId: instanceId,
              name,
              // replace all references with variable names
              code: validateExpression(dataSource.code, {
                transformIdentifier: (ref) => {
                  const id = dataSourceByRef.get(ref)?.id ?? ref;
                  return encodeDataSourceVariable(id);
                },
              }),
            });
          }
        }
      }

      // populate props
      if (item.props) {
        for (const prop of item.props) {
          const propId = nanoid();
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
                  code: validateExpression(value.code, {
                    effectful: true,
                    transformIdentifier: (ref) => {
                      // bypass arguments without changes
                      if (args.includes(ref)) {
                        return ref;
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
          if (prop.type === "dataSource") {
            const dataSource = dataSourceByRef.get(prop.dataSourceName);
            if (dataSource === undefined) {
              throw Error(`${prop.dataSourceName} data source is not defined`);
            }
            props.push({
              id: propId,
              instanceId,
              type: "dataSource",
              name: prop.name,
              value: dataSource.id,
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
        const styleSourceId = nanoid();
        styleSources.push({
          type: "local",
          id: styleSourceId,
        });
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
        defaultBreakpointId
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
  }
  return parentChildren;
};

export const generateDataFromEmbedTemplate = (
  treeTemplate: WsEmbedTemplate,
  metas: Map<Instance["component"], WsComponentMeta>,
  defaultBreakpointId: Breakpoint["id"]
) => {
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
    defaultBreakpointId
  );

  return {
    children,
    instances,
    props,
    dataSources: Array.from(dataSourceByRef.values()),
    styleSourceSelections,
    styleSources,
    styles,
  };
};

export type EmbedTemplateData = ReturnType<
  typeof generateDataFromEmbedTemplate
>;

const namespaceEmbedTemplateComponents = (
  template: WsEmbedTemplate,
  namespace: string,
  components: Set<EmbedTemplateInstance["component"]>
): WsEmbedTemplate => {
  return template.map((item) => {
    if (item.type === "text") {
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
