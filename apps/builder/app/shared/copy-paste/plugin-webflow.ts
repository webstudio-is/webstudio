import { nanoid } from "nanoid";
import type { Instance, Prop, WebstudioFragment } from "@webstudio-is/sdk";
import {
  computeInstancesConstraints,
  findClosestDroppableTarget,
  insertTemplateData,
} from "../instance-utils";
import {
  $breakpoints,
  $instances,
  $registeredComponentMetas,
  $selectedInstanceSelector,
  $selectedPage,
} from "../nano-states";
import { z } from "zod";
import { isBaseBreakpoint } from "../breakpoints";
import { parseCss } from "@webstudio-is/css-data";
import { isFeatureEnabled } from "@webstudio-is/feature-flags";

export const mimeType = "application/json";

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

const WfElementNode = z.union([
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
type WfElementNode = z.infer<typeof WfElementNode>;

const WfNode = z.union([WfElementNode, WfTextNode]);
type WfNode = z.infer<typeof WfNode>;

const WfStyle = z.object({
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

type WfStyle = z.infer<typeof WfStyle>;

const WfData = z.object({
  type: z.literal("@webflow/XscpData"),
  payload: z.object({
    // Using WfBaseNode here just so we can skip a node with unknown node.type.
    nodes: z.array(z.union([WfNode, WfBaseNode])),
    styles: z.array(WfStyle),
  }),
});
type WfData = z.infer<typeof WfData>;

const addStyles = (
  wfNodes: Map<WfNode["_id"], WfNode>,
  wfStyles: Map<WfStyle["_id"], WfStyle>,
  added: Map<WfNode["_id"], Instance["id"]>,
  fragment: WebstudioFragment
) => {
  for (const wfNode of wfNodes.values()) {
    if ("text" in wfNode) {
      continue;
    }
    for (const classId of wfNode.classes) {
      const style = wfStyles.get(classId);
      if (style === undefined) {
        continue;
      }
      const styleSourceId = nanoid();
      fragment.styleSources.push({
        type: "token",
        id: styleSourceId,
        name: style.name,
      });
      const instanceId = added.get(wfNode._id);
      if (instanceId === undefined) {
        console.error(`No instance id found for node ${wfNode._id}`);
        continue;
      }

      let styleSourceSelection = fragment.styleSourceSelections.find(
        (selection) => selection.instanceId === instanceId
      );
      if (styleSourceSelection === undefined) {
        styleSourceSelection = { instanceId, values: [] };
        fragment.styleSourceSelections.push(styleSourceSelection);
      }
      styleSourceSelection.values.push(styleSourceId);

      const breakpointId = Array.from($breakpoints.get().values()).find(
        isBaseBreakpoint
      )?.id;
      if (breakpointId === undefined) {
        console.error("No base breakpoint found - should never happen");
        continue;
      }
      try {
        const styles = parseCss(`.styles {${style.styleLess}}`).styles ?? [];
        for (const style of styles) {
          fragment.styles.push({
            styleSourceId,
            breakpointId,
            property: style.property,
            value: style.value,
          });
          if (style.value.type === "invalid") {
            console.error("Invalid style value", style);
          }
        }
      } catch (error) {
        console.error("Failed to parse style", error, style.styleLess);
      }
    }
  }
};

const addAttributes = (
  wfNode: WfElementNode,
  instanceId: Instance["id"],
  props: Array<Prop>
) => {
  if ("tag" in wfNode) {
    props.push({
      type: "string",
      id: nanoid(),
      instanceId,
      name: "tag",
      value: wfNode.tag,
    });
  }

  if (wfNode.data?.xattr) {
    for (const attribute of wfNode.data.xattr) {
      props.push({
        type: "string",
        id: nanoid(),
        instanceId,
        name: attribute.name,
        value: attribute.value,
      });
    }
  }
};

const mapComponentAndProperties = (
  wfNode: WfElementNode,
  instanceId: Instance["id"]
) => {
  const props: Array<Prop> = [];
  const component = wfNode.type;

  switch (component) {
    case "Heading":
    case "List":
    case "ListItem":
    case "Paragraph":
    case "Superscript":
    case "Subscript":
    case "Blockquote": {
      return { component, props };
    }
    case "Block": {
      const component = wfNode.data?.text ? "Text" : "Box";
      return { component, props };
    }
    case "Link": {
      const data = wfNode.data;

      if (data.link.url) {
        props.push({
          type: "string",
          id: nanoid(),
          instanceId,
          name: "href",
          value: data.link.url,
        });
      }
      if (data.link.target) {
        props.push({
          type: "string",
          id: nanoid(),
          instanceId,
          name: "target",
          value: data.link.target,
        });
      }
      return { component, props };
    }
    case "Section": {
      const component = "Box";
      return { component, props };
    }
    case "RichText": {
      const component = "Box";
      return { component, props };
    }
    case "Strong": {
      const component = "Bold";
      return { component, props };
    }
    case "Emphasized": {
      const component = "Italic";
      return { component, props };
    }
    case "BlockContainer": {
      const component = "Box";
      return { component, props };
    }
    case "Layout": {
      const component = "Box";
      return { component, props };
    }
    case "Cell": {
      const component = "Box";
      return { component, props };
    }
    case "VFlex": {
      const component = "Box";
      return { component, props };
    }
    case "HFlex": {
      const component = "Box";
      return { component, props };
    }
    case "Grid": {
      const component = "Box";
      return { component, props };
    }
    case "Row": {
      const component = "Box";
      return { component, props };
    }
    case "Column": {
      const component = "Box";
      return { component, props };
    }
    case "CodeBlock": {
      const component = "CodeText";
      const data = wfNode.data;

      if (data.language) {
        props.push({
          type: "string",
          id: nanoid(),
          instanceId,
          name: "lang",
          value: data.language,
        });
      }

      if (data.code) {
        props.push({
          type: "string",
          id: nanoid(),
          instanceId,
          name: "code",
          value: data.code,
        });
      }
      return { component, props };
    }
    case "Image": {
      const data = wfNode.data;

      if (
        data.attr.alt &&
        // This is how they tell it when alt comes from image meta during publishing
        data.attr.alt !== "__wf_reserved_inherit" &&
        // This is how they tell it to use alt="", which is our default anyways
        data.attr.alt !== "__wf_reserved_decorative"
      ) {
        props.push({
          type: "string",
          id: nanoid(),
          instanceId,
          name: "alt",
          value: data.attr.alt,
        });
      }

      if (data.attr.loading === "eager" || data.attr.loading === "lazy") {
        props.push({
          type: "string",
          id: nanoid(),
          instanceId,
          name: "loading",
          value: data.attr.loading,
        });
      }

      if (data.attr.width && data.attr.width !== "auto") {
        props.push({
          type: "string",
          id: nanoid(),
          instanceId,
          name: "width",
          value: data.attr.width,
        });
      }

      if (data.attr.height && data.attr.height !== "auto") {
        props.push({
          type: "string",
          id: nanoid(),
          instanceId,
          name: "height",
          value: data.attr.height,
        });
      }
      if (data.attr.src) {
        props.push({
          type: "string",
          id: nanoid(),
          instanceId,
          name: "src",
          value: data.attr.src,
        });
      }
      return { component, props };
    }
  }

  component satisfies never;
};

const addInstanceAndProperties = (
  wfNode: WfNode,
  added: Map<WfNode["_id"], Instance["id"]>,
  wfNodes: Map<WfNode["_id"], WfNode>,
  fragment: WebstudioFragment
) => {
  if (added.get(wfNode._id) || "text" in wfNode || "type" in wfNode === false) {
    return;
  }
  const children: Instance["children"] = [];
  const instanceId = nanoid();
  for (const wfChildId of wfNode.children) {
    const wfChildNode = wfNodes.get(wfChildId);
    if (wfChildNode === undefined) {
      continue;
    }
    if ("text" in wfChildNode) {
      children.push({
        type: "text",
        value: wfChildNode.v,
      });
      added.set(wfChildId, instanceId);
      continue;
    }

    const childInstanceId = addInstanceAndProperties(
      wfChildNode,
      added,
      wfNodes,
      fragment
    );
    if (childInstanceId !== undefined) {
      children.push({
        type: "id",
        value: childInstanceId,
      });
    }
  }

  const { component, props } = mapComponentAndProperties(wfNode, instanceId);

  fragment.instances.push({
    id: instanceId,
    type: "instance",
    component,
    children,
  });
  added.set(wfNode._id, instanceId);
  addAttributes(wfNode, instanceId, props);
  fragment.props.push(...props);

  return instanceId;
};

const toWebstudioFragment = (wfData: WfData) => {
  const fragment: WebstudioFragment = {
    children: [],
    instances: [],
    props: [],
    breakpoints: [],
    styles: [],
    styleSources: [],
    styleSourceSelections: [],
    dataSources: [],
    resources: [],
    assets: [],
  };

  const wfNodes = new Map<WfNode["_id"], WfNode>();
  for (const node of wfData.payload.nodes) {
    if ("type" in node || "text" in node) {
      wfNodes.set(node._id, node);
    }
  }
  const wfStyles = new Map<WfStyle["_id"], WfStyle>(
    wfData.payload.styles.map((style: WfStyle) => [style._id, style])
  );
  const added = new Map<WfNode["_id"], Instance["id"]>();
  for (const wfNode of wfNodes.values()) {
    addInstanceAndProperties(wfNode, added, wfNodes, fragment);
  }
  addStyles(wfNodes, wfStyles, added, fragment);
  // First node should be always the root node in theory, if not
  // we need to find a node that is not a child of any other node.
  const rootWfNode = wfData.payload.nodes[0];
  const rootInstanceId = added.get(rootWfNode._id);
  if (rootInstanceId === undefined) {
    console.error(`No root instance id found for node ${rootWfNode._id}`);
    return fragment;
  }
  fragment.children = [
    {
      type: "id",
      value: rootInstanceId,
    },
  ];
  return fragment;
};

const parse = (clipboardData: string) => {
  try {
    const data = JSON.parse(clipboardData);
    const result = WfData.safeParse(data);
    if (result.success) {
      return result.data;
    }
    throw result.error.message;
  } catch (error) {
    console.error(error);
  }
};

export const onPaste = (clipboardData: string): boolean => {
  if (isFeatureEnabled("pasteFromWebflow") === false) {
    return false;
  }
  const wfData = parse(clipboardData);
  if (wfData === undefined) {
    return false;
  }
  const fragment = toWebstudioFragment(wfData);
  const selectedPage = $selectedPage.get();
  if (fragment.instances.length === 0 || selectedPage === undefined) {
    return false;
  }
  const metas = $registeredComponentMetas.get();
  const newInstances = new Map(
    fragment.instances.map((instance) => [instance.id, instance])
  );
  const rootInstanceIds = fragment.children
    .filter((child) => child.type === "id")
    .map((child) => child.value);
  // paste to the root if nothing is selected
  const instanceSelector = $selectedInstanceSelector.get() ?? [
    selectedPage.rootInstanceId,
  ];
  const dropTarget = findClosestDroppableTarget(
    metas,
    $instances.get(),
    instanceSelector,
    computeInstancesConstraints(metas, newInstances, rootInstanceIds)
  );
  if (dropTarget === undefined) {
    return false;
  }
  insertTemplateData(fragment, dropTarget);
  return true;
};

export const __testing__ = {
  toWebstudioFragment,
};
