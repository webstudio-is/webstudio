import { z } from "zod";

const Attr = z
  .object({ id: z.string(), role: z.string(), href: z.string() })
  .partial();

const styleBase = z.string();

const styleBreakpoint = z.string();

const stylePseudo = z.string();

const styleProperty = z.string();

const styleValue = z.unknown();

const WfNodeData = z.object({
  attr: Attr.optional(),
  xattr: z.array(z.object({ name: z.string(), value: z.string() })).optional(),
  visibility: z
    .object({
      conditions: z.array(z.boolean()),
    })
    .optional(),
  style: z
    .record(
      styleBase,
      z.record(
        styleBreakpoint,
        z.record(stylePseudo, z.record(styleProperty, styleValue))
      )
    )
    .optional(),
});

const WfBaseNode = z.object({
  _id: z.string(),
  tag: z.string(),
  children: z.array(z.string()),
  classes: z.array(z.string()),
  data: WfNodeData.optional(),
  attr: Attr.optional(),
});

const WfTextNode = z.object({
  _id: z.string(),
  v: z.string(),
  text: z.boolean(),
});

const WfLinkData = WfNodeData.extend({
  attr: Attr.optional(),
  block: z.enum(["inline", "block", ""]).optional(),
  button: z.boolean().optional(),
  link: z.union([
    // External link
    z.object({
      url: z.string(),
      target: z.string().optional(),
    }),
    // Page link and section link
    z.object({
      href: z.string(),
    }),
    // Email link
    z.object({
      email: z.string(),
      subject: z.string().optional(),
    }),
    // Phone link
    z.object({
      tel: z.string(),
    }),
    z.object({
      mode: z.string(),
    }),
  ]),
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
  "Container",
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
  "FormWrapper",
  "FormForm",
  "FormSuccessMessage",
  "FormErrorMessage",
  "FormButton",
  "FormTextInput",
  "FormTextarea",
  "FormBlockLabel",
  "FormCheckboxWrapper",
  "FormCheckboxInput",
  "FormInlineLabel",
  "FormRadioWrapper",
  "FormRadioInput",
  "FormSelect",
  "LineBreak",
  "Span",
  "NavbarMenu",
  "NavbarWrapper",
  "NavbarBrand",
  "NavbarLink",
  "NavbarButton",
  "NavbarContainer",
  "Icon",
  "LightboxWrapper",
] as const;

const WfElementNode = z.union([
  WfBaseNode.extend({
    type: z.enum(["Icon"]),
    data: WfNodeData.extend({
      widget: z
        .object({
          type: z.string(),
          icon: z.string(),
        })
        .optional(),
    }),
  }),

  WfBaseNode.extend({ type: z.enum(["LightboxWrapper"]) }),
  WfBaseNode.extend({ type: z.enum(["NavbarMenu"]) }),
  WfBaseNode.extend({ type: z.enum(["NavbarContainer"]) }),

  WfBaseNode.extend({ type: z.enum(["NavbarWrapper"]) }),

  WfBaseNode.extend({
    type: z.enum(["NavbarBrand"]),
    data: WfLinkData,
  }),
  WfBaseNode.extend({
    type: z.enum(["NavbarLink"]),
    data: WfLinkData,
  }),

  WfBaseNode.extend({ type: z.enum(["NavbarButton"]) }),

  WfBaseNode.extend({ type: z.enum(["Heading"]) }),
  WfBaseNode.extend({
    type: z.enum(["Block"]),
    data: WfNodeData.extend({
      attr: Attr.optional(),
      text: z.boolean().optional(),
    }).optional(),
  }),
  WfBaseNode.extend({ type: z.enum(["List"]) }),
  WfBaseNode.extend({ type: z.enum(["ListItem"]) }),
  WfBaseNode.extend({
    type: z.enum(["Link"]),
    data: WfLinkData,
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
  WfBaseNode.extend({ type: z.enum(["Container"]) }),
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
      attr: Attr.optional(),
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
      attr: Attr.extend({
        alt: z.string().optional(),
        loading: z.enum(["lazy", "eager", "auto"]),
        src: z.string(),
        width: z.string(),
        height: z.string(),
      }),
    }),
  }),
  WfBaseNode.extend({ type: z.enum(["FormWrapper"]) }),
  WfBaseNode.extend({
    type: z.enum(["FormForm"]),
    data: WfNodeData.extend({
      attr: Attr.extend({
        action: z.string(),
        method: z.string(),
        name: z.string(),
      }),
    }),
  }),
  WfBaseNode.extend({ type: z.enum(["FormSuccessMessage"]) }),
  WfBaseNode.extend({ type: z.enum(["FormErrorMessage"]) }),
  WfBaseNode.extend({
    type: z.enum(["FormButton"]),
    data: WfNodeData.extend({
      attr: Attr.extend({
        value: z.string(),
      }),
    }),
  }),
  WfBaseNode.extend({
    type: z.enum(["FormTextInput"]),
    data: WfNodeData.extend({
      attr: Attr.extend({
        name: z.string(),
        maxlength: z.number(),
        placeholder: z.string(),
        disabled: z.boolean(),
        type: z.string(),
        required: z.boolean(),
        autofocus: z.boolean(),
      }),
    }),
  }),
  WfBaseNode.extend({
    type: z.enum(["FormTextarea"]),
    data: WfNodeData.extend({
      attr: Attr.extend({
        name: z.string(),
        maxlength: z.number(),
        placeholder: z.string(),
        required: z.boolean(),
        autofocus: z.boolean(),
      }),
    }),
  }),
  WfBaseNode.extend({
    type: z.enum(["FormBlockLabel"]),
    data: WfNodeData.extend({
      attr: Attr.extend({
        for: z.string().optional(),
      }),
    }),
  }),
  WfBaseNode.extend({
    type: z.enum(["FormCheckboxWrapper"]),
  }),

  WfBaseNode.extend({
    type: z.enum(["FormCheckboxInput"]),
    data: WfNodeData.extend({
      attr: Attr.extend({
        type: z.enum(["checkbox"]),
        name: z.string(),
        required: z.boolean(),
        checked: z.boolean(),
      }),
    }),
  }),
  WfBaseNode.extend({
    type: z.enum(["FormInlineLabel"]),
  }),
  WfBaseNode.extend({
    type: z.enum(["FormRadioWrapper"]),
  }),
  WfBaseNode.extend({
    type: z.enum(["FormRadioInput"]),
    data: WfNodeData.extend({
      attr: Attr.extend({
        type: z.enum(["radio"]),
        name: z.string(),
        required: z.boolean(),
        value: z.string(),
      }),
    }),
  }),
  WfBaseNode.extend({
    type: z.enum(["FormSelect"]),
    data: WfNodeData.extend({
      attr: Attr.extend({
        name: z.string(),
        required: z.boolean(),
        multiple: z.boolean(),
      }),
      form: z.object({
        opts: z.array(
          z.object({
            t: z.string(),
            v: z.string(),
          })
        ),
      }),
    }),
  }),
  WfBaseNode.extend({ type: z.enum(["LineBreak"]) }),
  WfBaseNode.extend({ type: z.enum(["Span"]) }),
]);

export type WfElementNode = z.infer<typeof WfElementNode>;

[...wfNodeTypes] as const satisfies WfElementNode["type"][];

//@todo verify the other way around too
//(typeof WfElementNode)["type"] satisfies typeof wfNodeTypes[number]

const WfNode = z.union([WfElementNode, WfTextNode]);
export type WfNode = z.infer<typeof WfNode>;

const WfStyle = z.object({
  _id: z.string(),
  type: z.enum(["class"]),
  name: z.string(),
  styleLess: z.string(),
  fake: z.boolean().optional(),
  comb: z.string().optional(),
  namespace: z.string().optional(),
  variants: z
    .record(z.string(), z.object({ styleLess: z.string() }))
    .optional(),
  children: z.array(z.string()).optional(),
});
export type WfStyle = z.infer<typeof WfStyle>;

const WfErrorAssetVariant = z.object({
  origFileName: z.string(),
  fileName: z.string(),
  format: z.string(),
  size: z.number().optional(),
  width: z.number().optional(),
  height: z.number().optional(),
  quality: z.number().optional(),
  error: z.string(),
  _id: z.string(),
});

const WfAssetVariant = z.object({
  origFileName: z.string(),
  fileName: z.string(),
  format: z.string(),
  size: z.number().optional(),
  width: z.number().optional(),
  height: z.number().optional(),
  quality: z.number().optional(),
  cdnUrl: z.string().url(),
  s3Url: z.string().url(),
});

const WfAsset = z.object({
  cdnUrl: z.string().url(),
  siteId: z.string(),
  width: z.number().optional(),
  height: z.number().optional(),
  fileName: z.string(),
  createdOn: z.string(),
  origFileName: z.string(),
  fileHash: z.string(),
  variants: z.array(z.union([WfAssetVariant, WfErrorAssetVariant])).optional(),
  mimeType: z.string(),
  s3Url: z.string().url(),
  thumbUrl: z.string().optional(),
  _id: z.string(),
  markedAsDeleted: z.boolean().optional(),
  fileSize: z.number(),
});

export type WfAsset = z.infer<typeof WfAsset>;

export const WfData = z.object({
  type: z.literal("@webflow/XscpData"),
  payload: z.object({
    // Using WfBaseNode here just so we can skip a node with unknown node.type.
    nodes: z.array(z.union([WfNode, WfBaseNode])),
    styles: z.array(WfStyle),
    assets: z.array(WfAsset),
  }),
});
export type WfData = z.infer<typeof WfData>;
