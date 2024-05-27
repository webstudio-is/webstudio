import { nanoid } from "nanoid";
import type { Instance, Prop, WebstudioFragment } from "@webstudio-is/sdk";
import {
  computeInstancesConstraints,
  findClosestDroppableTarget,
  insertTemplateData,
} from "../instance-utils";
import {
  $instances,
  $registeredComponentMetas,
  $selectedInstanceSelector,
  $selectedPage,
} from "../nano-states";
import { z } from "zod";

export const mimeType = "application/json";

const WebflowNode = z.union([
  z.object({
    _id: z.string(),
    type: z.string(),
    tag: z.string(),
    children: z.array(z.string()),
  }),
  z.object({
    _id: z.string(),
    v: z.string(),
    text: z.boolean(),
  }),
]);
type WebflowNode = z.infer<typeof WebflowNode>;

const WebflowData = z.object({
  type: z.literal("@webflow/XscpData"),
  payload: z.object({
    nodes: z.array(WebflowNode),
  }),
});
type WebflowData = z.infer<typeof WebflowData>;

const toInstanceData = (webflowData: WebflowData) => {
  const instances: Array<Instance> = [];
  const props: Array<Prop> = [];
  const nodesMap = new Map<string, WebflowNode>(
    webflowData.payload.nodes.map((node: WebflowNode) => [node._id, node])
  );
  const addedMap = new Map<string, boolean>();

  for (const node of webflowData.payload.nodes) {
    if (addedMap.get(node._id) || "text" in node) {
      continue;
    }
    const children: Instance["children"] = [];
    for (const childId of node.children) {
      const childNode = nodesMap.get(childId);
      if (childNode === undefined) {
        continue;
      }
      if ("text" in childNode) {
        children.push({
          type: "text",
          value: childNode.v,
        });
        addedMap.set(childId, true);
      }
    }
    const instanceId = nanoid();
    instances.push({
      id: instanceId,
      type: "instance",
      component: node.type,
      children,
    });
    addedMap.set(node._id, true);
    // Webflow nodes always come with a tag.
    // We support tag only for instances like Heading, not all of them.
    // @todo decide hat to do about other instances.
    if (node.tag) {
      props.push({
        type: "string",
        id: nanoid(),
        instanceId,
        name: "tag",
        value: node.tag,
      });
    }
  }

  const data: WebstudioFragment = {
    children: instances.map((instance) => ({ type: "id", value: instance.id })),
    instances,
    props,
    breakpoints: [],
    styles: [],
    styleSources: [],
    styleSourceSelections: [],
    dataSources: [],
    resources: [],
    assets: [],
  };

  return data;
};

const parse = (clipboardData: string) => {
  try {
    const data = JSON.parse(clipboardData);
    return WebflowData.parse(data);
  } catch (error) {
    console.error(error);
  }
};

export const onPaste = (clipboardData: string): boolean => {
  const webflowData = parse(clipboardData);
  if (webflowData === undefined) {
    return false;
  }
  const data = toInstanceData(webflowData);
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
  toInstanceData,
};
