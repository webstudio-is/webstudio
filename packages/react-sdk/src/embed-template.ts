import { z } from "zod";
import { nanoid } from "nanoid";
import {
  type Instance,
  type InstancesList,
  PropsList,
  StyleSourceSelectionsList,
  StyleSourcesList,
  StylesList,
  Breakpoint,
} from "@webstudio-is/project-build";
import { StyleValue, type StyleProperty } from "@webstudio-is/css-data";
import type { Simplify } from "type-fest";

const EmbedTemplateText = z.object({
  type: z.literal("text"),
  value: z.string(),
});

type EmbedTemplateText = z.infer<typeof EmbedTemplateText>;

const EmbedTemplateProp = z.union([
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
  props?: EmbedTemplateProp[];
  styles?: EmbedTemplateStyleDecl[];
  children: Array<EmbedTemplateInstance | EmbedTemplateText>;
};

export const EmbedTemplateInstance: z.ZodType<EmbedTemplateInstance> = z.lazy(
  () =>
    z.object({
      type: z.literal("instance"),
      component: z.string(),
      label: z.optional(z.string()),
      props: z.optional(z.array(EmbedTemplateProp)),
      styles: z.optional(z.array(EmbedTemplateStyleDecl)),
      children: WsEmbedTemplate,
    })
);

export const WsEmbedTemplate = z.lazy(() =>
  z.array(z.union([EmbedTemplateInstance, EmbedTemplateText]))
);

export type WsEmbedTemplate = z.infer<typeof WsEmbedTemplate>;

const createInstancesFromTemplate = (
  treeTemplate: WsEmbedTemplate,
  instances: InstancesList,
  props: PropsList,
  styleSourceSelections: StyleSourceSelectionsList,
  styleSources: StyleSourcesList,
  styles: StylesList,
  defaultBreakpointId: Breakpoint["id"]
) => {
  const parentChildren: Instance["children"] = [];
  for (const item of treeTemplate) {
    if (item.type === "instance") {
      const instanceId = nanoid();

      // populate props
      if (item.props) {
        for (const prop of item.props) {
          props.push({
            id: nanoid(),
            instanceId,
            ...prop,
          });
        }
      }

      // populate styles
      if (item.styles) {
        const styleSourceId = nanoid();
        styleSources.push({
          type: "local",
          id: styleSourceId,
        });
        styleSourceSelections.push({
          instanceId,
          values: [styleSourceId],
        });
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
        styleSourceSelections,
        styleSources,
        styles,
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
  defaultBreakpointId: Breakpoint["id"]
) => {
  const instances: InstancesList = [];
  const props: PropsList = [];
  const styleSourceSelections: StyleSourceSelectionsList = [];
  const styleSources: StyleSourcesList = [];
  const styles: StylesList = [];

  const children = createInstancesFromTemplate(
    treeTemplate,
    instances,
    props,
    styleSourceSelections,
    styleSources,
    styles,
    defaultBreakpointId
  );
  return {
    children,
    instances,
    props,
    styleSourceSelections,
    styleSources,
    styles,
  };
};
