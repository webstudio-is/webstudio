import { z } from "zod";

const WfNodeData = z.object({
  xattr: z.array(z.object({ name: z.string(), value: z.string() })).optional(),
});

const WfBaseNode = z.object({
  _id: z.string(),
  tag: z.string(),
  children: z.array(z.string()),
  classes: z.array(z.string()),
  data: WfNodeData.optional(),
});

const WfTextNode = z.object({
  _id: z.string(),
  v: z.string(),
  text: z.boolean(),
});

export const wfNodeTypes = [
  "Heading",
  "Block",
  "List",
  "ListItem",
  "Link",
  "Paragraph",
  "Blockquote",
  "RichText",
  "Strong",
  "Emphasized",
  "Superscript",
  "Subscript",
  "Section",
  "BlockContainer",
  "Layout",
  "Cell",
  "VFlex",
  "HFlex",
  "Grid",
  "Row",
  "Column",
  "CodeBlock",
  "HtmlEmbed",
  "Image",
] as const;

export const WfElementNode = z.union([
  WfBaseNode.extend({ type: z.enum(["Heading"]) }),
  WfBaseNode.extend({
    type: z.enum(["Block"]),
    data: WfNodeData.extend({ text: z.boolean().optional() }).optional(),
  }),
  WfBaseNode.extend({ type: z.enum(["List"]) }),
  WfBaseNode.extend({ type: z.enum(["ListItem"]) }),
  WfBaseNode.extend({
    type: z.enum(["Link"]),
    data: WfNodeData.extend({
      block: z.enum(["inline", "block", ""]).optional(),
      button: z.boolean().optional(),
      link: z.object({
        url: z.string(),
        target: z.string().optional(),
      }),
    }),
  }),
  WfBaseNode.extend({ type: z.enum(["Paragraph"]) }),
  WfBaseNode.extend({ type: z.enum(["Blockquote"]) }),
  WfBaseNode.extend({ type: z.enum(["RichText"]) }),
  WfBaseNode.extend({ type: z.enum(["Strong"]) }),
  WfBaseNode.extend({ type: z.enum(["Emphasized"]) }),
  WfBaseNode.extend({ type: z.enum(["Superscript"]) }),
  WfBaseNode.extend({ type: z.enum(["Subscript"]) }),
  WfBaseNode.extend({ type: z.enum(["Section"]) }),
  WfBaseNode.extend({ type: z.enum(["BlockContainer"]) }),
  WfBaseNode.extend({ type: z.enum(["Layout"]) }),
  WfBaseNode.extend({ type: z.enum(["Cell"]) }),
  WfBaseNode.extend({ type: z.enum(["VFlex"]) }),
  WfBaseNode.extend({ type: z.enum(["HFlex"]) }),
  WfBaseNode.extend({ type: z.enum(["Grid"]) }),
  WfBaseNode.extend({ type: z.enum(["Row"]) }),
  WfBaseNode.extend({ type: z.enum(["Column"]) }),
  WfBaseNode.extend({
    type: z.enum(["CodeBlock"]),
    data: WfNodeData.extend({
      language: z.string().optional(),
      code: z.string(),
    }),
  }),
  WfBaseNode.extend({
    type: z.enum(["HtmlEmbed"]),
    v: z.string(),
  }),

  WfBaseNode.extend({
    type: z.enum(["Image"]),
    data: WfNodeData.extend({
      attr: z.object({
        alt: z.string(),
        loading: z.enum(["lazy", "eager", "auto"]),
        src: z.string(),
        width: z.string(),
        height: z.string(),
      }),
    }),
  }),
]);

export type WfElementNode = z.infer<typeof WfElementNode>;

[...wfNodeTypes] as const satisfies WfElementNode["type"][];

export const WfNode = z.union([WfElementNode, WfTextNode]);
export type WfNode = z.infer<typeof WfNode>;

export const WfStyle = z.object({
  _id: z.string(),
  type: z.enum(["class"]),
  name: z.string(),
  styleLess: z.string(),
  fake: z.boolean().optional(),
  comb: z.string().optional(),
  namespace: z.string().optional(),
  variants: z.object({}).optional(),
  children: z.array(z.string()).optional(),
  createdBy: z.string().optional(),
  origin: z.null().optional(),
  selector: z.null().optional(),
});
export type WfStyle = z.infer<typeof WfStyle>;

export const WfData = z.object({
  type: z.literal("@webflow/XscpData"),
  payload: z.object({
    // Using WfBaseNode here just so we can skip a node with unknown node.type.
    nodes: z.array(z.union([WfNode, WfBaseNode])),
    styles: z.array(WfStyle),
  }),
});
export type WfData = z.infer<typeof WfData>;
