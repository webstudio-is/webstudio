import { z } from "zod";

const attr = z
  .object({ id: z.string(), role: z.string(), href: z.string() })
  .partial();

const styleBase = z.string();

const styleBreakpoint = z.string();

const stylePseudo = z.string();

const styleProperty = z.string();

const styleValue = z.unknown();

const wfNodeData = z.object({
  attr: attr.optional(),
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

const wfBaseNode = z.object({
  _id: z.string(),
  tag: z.string(),
  children: z.array(z.string()),
  classes: z.array(z.string()),
  data: wfNodeData.optional(),
  attr: attr.optional(),
});

const wfTextNode = z.object({
  _id: z.string(),
  v: z.string(),
  text: z.boolean(),
});

const wfLinkData = wfNodeData.extend({
  attr: attr.optional(),
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

const wfElementNode = z.union([
  wfBaseNode.extend({
    type: z.enum(["Icon"]),
    data: wfNodeData.extend({
      widget: z
        .object({
          type: z.string(),
          icon: z.string(),
        })
        .optional(),
    }),
  }),

  wfBaseNode.extend({ type: z.enum(["LightboxWrapper"]) }),
  wfBaseNode.extend({ type: z.enum(["NavbarMenu"]) }),
  wfBaseNode.extend({ type: z.enum(["NavbarContainer"]) }),

  wfBaseNode.extend({ type: z.enum(["NavbarWrapper"]) }),

  wfBaseNode.extend({
    type: z.enum(["NavbarBrand"]),
    data: wfLinkData,
  }),
  wfBaseNode.extend({
    type: z.enum(["NavbarLink"]),
    data: wfLinkData,
  }),

  wfBaseNode.extend({ type: z.enum(["NavbarButton"]) }),

  wfBaseNode.extend({ type: z.enum(["Heading"]) }),
  wfBaseNode.extend({
    type: z.enum(["Block"]),
    data: wfNodeData
      .extend({
        attr: attr.optional(),
        text: z.boolean().optional(),
      })
      .optional(),
  }),
  wfBaseNode.extend({ type: z.enum(["List"]) }),
  wfBaseNode.extend({ type: z.enum(["ListItem"]) }),
  wfBaseNode.extend({
    type: z.enum(["Link"]),
    data: wfLinkData,
  }),
  wfBaseNode.extend({ type: z.enum(["Paragraph"]) }),
  wfBaseNode.extend({ type: z.enum(["Blockquote"]) }),
  wfBaseNode.extend({ type: z.enum(["RichText"]) }),
  wfBaseNode.extend({ type: z.enum(["Strong"]) }),
  wfBaseNode.extend({ type: z.enum(["Emphasized"]) }),
  wfBaseNode.extend({ type: z.enum(["Superscript"]) }),
  wfBaseNode.extend({ type: z.enum(["Subscript"]) }),
  wfBaseNode.extend({ type: z.enum(["Section"]) }),
  wfBaseNode.extend({ type: z.enum(["BlockContainer"]) }),
  wfBaseNode.extend({ type: z.enum(["Container"]) }),
  wfBaseNode.extend({ type: z.enum(["Layout"]) }),
  wfBaseNode.extend({ type: z.enum(["Cell"]) }),
  wfBaseNode.extend({ type: z.enum(["VFlex"]) }),
  wfBaseNode.extend({ type: z.enum(["HFlex"]) }),
  wfBaseNode.extend({ type: z.enum(["Grid"]) }),
  wfBaseNode.extend({ type: z.enum(["Row"]) }),
  wfBaseNode.extend({ type: z.enum(["Column"]) }),
  wfBaseNode.extend({
    type: z.enum(["CodeBlock"]),
    data: wfNodeData.extend({
      attr: attr.optional(),
      language: z.string().optional(),
      code: z.string(),
    }),
  }),
  wfBaseNode.extend({
    type: z.enum(["HtmlEmbed"]),
    v: z.string(),
  }),
  wfBaseNode.extend({
    type: z.enum(["Image"]),
    data: wfNodeData.extend({
      attr: attr.extend({
        alt: z.string().optional(),
        loading: z.enum(["lazy", "eager", "auto"]),
        src: z.string(),
        width: z.string(),
        height: z.string(),
      }),
    }),
  }),
  wfBaseNode.extend({ type: z.enum(["FormWrapper"]) }),
  wfBaseNode.extend({
    type: z.enum(["FormForm"]),
    data: wfNodeData.extend({
      attr: attr.extend({
        action: z.string(),
        method: z.string(),
        name: z.string(),
      }),
    }),
  }),
  wfBaseNode.extend({ type: z.enum(["FormSuccessMessage"]) }),
  wfBaseNode.extend({ type: z.enum(["FormErrorMessage"]) }),
  wfBaseNode.extend({
    type: z.enum(["FormButton"]),
    data: wfNodeData.extend({
      attr: attr.extend({
        value: z.string(),
      }),
    }),
  }),
  wfBaseNode.extend({
    type: z.enum(["FormTextInput"]),
    data: wfNodeData.extend({
      attr: attr.extend({
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
  wfBaseNode.extend({
    type: z.enum(["FormTextarea"]),
    data: wfNodeData.extend({
      attr: attr.extend({
        name: z.string(),
        maxlength: z.number(),
        placeholder: z.string(),
        required: z.boolean(),
        autofocus: z.boolean(),
      }),
    }),
  }),
  wfBaseNode.extend({
    type: z.enum(["FormBlockLabel"]),
    data: wfNodeData.extend({
      attr: attr.extend({
        for: z.string().optional(),
      }),
    }),
  }),
  wfBaseNode.extend({
    type: z.enum(["FormCheckboxWrapper"]),
  }),

  wfBaseNode.extend({
    type: z.enum(["FormCheckboxInput"]),
    data: wfNodeData.extend({
      attr: attr.extend({
        type: z.enum(["checkbox"]),
        name: z.string(),
        required: z.boolean(),
        checked: z.boolean(),
      }),
    }),
  }),
  wfBaseNode.extend({
    type: z.enum(["FormInlineLabel"]),
  }),
  wfBaseNode.extend({
    type: z.enum(["FormRadioWrapper"]),
  }),
  wfBaseNode.extend({
    type: z.enum(["FormRadioInput"]),
    data: wfNodeData.extend({
      attr: attr.extend({
        type: z.enum(["radio"]),
        name: z.string(),
        required: z.boolean(),
        value: z.string(),
      }),
    }),
  }),
  wfBaseNode.extend({
    type: z.enum(["FormSelect"]),
    data: wfNodeData.extend({
      attr: attr.extend({
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
  wfBaseNode.extend({ type: z.enum(["LineBreak"]) }),
  wfBaseNode.extend({ type: z.enum(["Span"]) }),
]);

export type WfElementNode = z.infer<typeof wfElementNode>;

[...wfNodeTypes] as const satisfies WfElementNode["type"][];

//@todo verify the other way around too
//(typeof WfElementNode)["type"] satisfies typeof wfNodeTypes[number]

const wfNode = z.union([wfElementNode, wfTextNode]);
export type WfNode = z.infer<typeof wfNode>;

const wfStyle = z.object({
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
export type WfStyle = z.infer<typeof wfStyle>;

const wfErrorAssetVariant = z.object({
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

const wfAssetVariant = z.object({
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

const wfAsset = z.object({
  cdnUrl: z.string().url(),
  siteId: z.string(),
  width: z.number().optional(),
  height: z.number().optional(),
  fileName: z.string(),
  createdOn: z.string(),
  origFileName: z.string(),
  fileHash: z.string(),
  variants: z.array(z.union([wfAssetVariant, wfErrorAssetVariant])).optional(),
  mimeType: z.string(),
  s3Url: z.string().url(),
  thumbUrl: z.string().optional(),
  _id: z.string(),
  markedAsDeleted: z.boolean().optional(),
  fileSize: z.number(),
});

export type WfAsset = z.infer<typeof wfAsset>;

export const wfData = z.object({
  type: z.literal("@webflow/XscpData"),
  payload: z.object({
    // Using WfBaseNode here just so we can skip a node with unknown node.type.
    nodes: z.array(z.union([wfNode, wfBaseNode])),
    styles: z.array(wfStyle),
    assets: z.array(wfAsset),
  }),
});
export type WfData = z.infer<typeof wfData>;
