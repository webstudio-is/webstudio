import { nanoid } from "nanoid";
import type { Instance, WebstudioFragment } from "@webstudio-is/sdk";
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

// A list of Webflow component names that need to be mapped.
const componentMappers = {
  Block(wfNode: WfNode) {
    if ("type" in wfNode === false || wfNode.type !== "Block") {
      return;
    }
    return wfNode.data.text ? "Text" : "Box";
  },
};

const WfBaseNode = z.object({
  _id: z.string(),
  tag: z.string(),
  children: z.array(z.string()),
  classes: z.array(z.string()),
  data: z.object({}).optional(),
});

const WfTextNode = z.object({
  _id: z.string(),
  v: z.string(),
  text: z.boolean(),
});

const WfNode = z.union([
  WfBaseNode.extend({ type: z.enum(["Heading"]) }),
  WfBaseNode.extend({
    type: z.enum(["Block"]),
    data: z.object({ text: z.boolean().optional() }),
  }),
  WfBaseNode.extend({ type: z.enum(["List"]) }),
  WfBaseNode.extend({ type: z.enum(["ListItem"]) }),
  WfBaseNode.extend({
    type: z.enum(["Link"]),
    data: z.object({
      link: z.object({
        url: z.string(),
        target: z.string().optional(),
      }),
    }),
  }),
  WfBaseNode.extend({ type: z.enum(["Paragraph"]) }),
  WfBaseNode.extend({ type: z.enum(["Blockquote"]) }),
  WfTextNode,
]);
type WfNode = z.infer<typeof WfNode>;

const WfStyle = z.object({
  _id: z.string(),
  type: z.enum(["class"]),
  name: z.string(),
  styleLess: z.string(),
  //comb: z.string(),
  //namespace: z.string(),
  //variants: z.object(),
  //children: z.array(z.string()),
  //createdBy: z.string(),
  //origin: z.null(),
  //selector: z.null(),
});

type WfStyle = z.infer<typeof WfStyle>;

const WfData = z.object({
  type: z.literal("@webflow/XscpData"),
  payload: z.object({
    nodes: z.array(WfNode),
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
        console.error("No instance id found - should never happen");
        continue;
      }

      fragment.styleSourceSelections.push({
        instanceId,
        values: [styleSourceId],
      });

      const breakpointId = Array.from($breakpoints.get().values()).find(
        isBaseBreakpoint
      )?.id;
      if (breakpointId === undefined) {
        console.error("No base breakpoint found - should never happen");
        continue;
      }
      const styles = parseCss(`.styles {${style.styleLess}}`).styles ?? [];
      for (const style of styles) {
        fragment.styles.push({
          styleSourceId,
          breakpointId,
          property: style.property,
          value: style.value,
        });
      }
    }
  }
};

const addInstance = (
  wfNode: WfNode,
  added: Map<WfNode["_id"], Instance["id"]>,
  wfNodes: Map<WfNode["_id"], WfNode>,
  fragment: WebstudioFragment
) => {
  if (added.get(wfNode._id) || "text" in wfNode) {
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

    const childInstanceId = addInstance(wfChildNode, added, wfNodes, fragment);
    if (childInstanceId !== undefined) {
      children.push({
        type: "id",
        value: childInstanceId,
      });
    }
  }

  const component =
    wfNode.type in componentMappers
      ? componentMappers[wfNode.type as keyof typeof componentMappers](
          wfNode
        ) ?? wfNode.type
      : wfNode.type;

  fragment.instances.push({
    id: instanceId,
    type: "instance",
    component,
    children,
  });
  added.set(wfNode._id, instanceId);

  return instanceId;
};

// Converting Webflow attributes and data to Webstudio props.
const propertyMappers = {
  Link(wfNode: WfNode, instanceId: Instance["id"]) {
    if ("type" in wfNode === false || wfNode.type !== "Link") {
      return [];
    }
    const data = wfNode.data;
    const props: WebstudioFragment["props"] = [];

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
    return props;
  },
};

const addProperties = (
  wfNodes: Map<WfNode["_id"], WfNode>,
  added: Map<WfNode["_id"], Instance["id"]>,
  fragment: WebstudioFragment
) => {
  for (const wfNode of wfNodes.values()) {
    if ("text" in wfNode) {
      continue;
    }
    const instanceId = added.get(wfNode._id);
    if (instanceId === undefined) {
      console.error("No instance id found - should never happen");
      continue;
    }
    // Webflow nodes always come with a tag.
    // We support tag only for instances like Heading, not all of them.
    // @todo decide what to do about other instances.
    if ("tag" in wfNode) {
      fragment.props.push({
        type: "string",
        id: nanoid(),
        instanceId,
        name: "tag",
        value: wfNode.tag,
      });
    }
    if (wfNode.type in propertyMappers) {
      const props = propertyMappers[
        wfNode.type as keyof typeof propertyMappers
      ](wfNode, instanceId);
      fragment.props.push(...props);
    }
  }
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

  const wfNodes = new Map<WfNode["_id"], WfNode>(
    wfData.payload.nodes.map((node: WfNode) => [node._id, node])
  );
  const wfStyles = new Map<WfStyle["_id"], WfStyle>(
    wfData.payload.styles.map((style: WfStyle) => [style._id, style])
  );
  const added = new Map<WfNode["_id"], Instance["id"]>();
  for (const wfNode of wfNodes.values()) {
    addInstance(wfNode, added, wfNodes, fragment);
  }
  addStyles(wfNodes, wfStyles, added, fragment);
  addProperties(wfNodes, added, fragment);
  // First node should be always the root node in theory, if not
  // we need to find a node that is not a child of any other node.
  const rootWfNode = wfData.payload.nodes[0];
  const rootInstanceId = added.get(rootWfNode._id);
  if (rootInstanceId === undefined) {
    console.error("No root instance id found - should never happen");
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
  const data = toWebstudioFragment(wfData);
  const selectedPage = $selectedPage.get();
  if (data === undefined || selectedPage === undefined) {
    return false;
  }
  const metas = $registeredComponentMetas.get();
  const newInstances = new Map(
    data.instances.map((instance) => [instance.id, instance])
  );
  const rootInstanceIds = data.children
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
  insertTemplateData(data, dropTarget);
  return true;
};

export const __testing__ = {
  toWebstudioFragment,
};
