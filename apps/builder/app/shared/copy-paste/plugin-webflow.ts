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

export const mimeType = "application/json";

const WebflowNode = z.union([
  z.object({
    _id: z.string(),
    type: z.string(),
    tag: z.string(),
    children: z.array(z.string()),
    classes: z.array(z.string()),
  }),
  z.object({
    _id: z.string(),
    v: z.string(),
    text: z.boolean(),
  }),
]);
type WebflowNode = z.infer<typeof WebflowNode>;

const WebflowStyle = z.object({
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

type WebflowStyle = z.infer<typeof WebflowStyle>;

const WebflowData = z.object({
  type: z.literal("@webflow/XscpData"),
  payload: z.object({
    nodes: z.array(WebflowNode),
    styles: z.array(WebflowStyle),
  }),
});
type WebflowData = z.infer<typeof WebflowData>;

const toInstanceData = (webflowData: WebflowData) => {
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

  const wfNodes = new Map<string, WebflowNode>(
    webflowData.payload.nodes.map((node: WebflowNode) => [node._id, node])
  );
  const addedWfNodes = new Map<string, boolean>();
  const wfStyles = new Map<string, WebflowStyle>(
    webflowData.payload.styles.map((style: WebflowStyle) => [style._id, style])
  );

  for (const wfNode of webflowData.payload.nodes) {
    if (addedWfNodes.get(wfNode._id) || "text" in wfNode) {
      continue;
    }
    const children: Instance["children"] = [];
    for (const childId of wfNode.children) {
      const childNode = wfNodes.get(childId);
      if (childNode === undefined) {
        continue;
      }
      if ("text" in childNode) {
        children.push({
          type: "text",
          value: childNode.v,
        });
        addedWfNodes.set(childId, true);
      }
    }
    const instanceId = nanoid();
    fragment.instances.push({
      id: instanceId,
      type: "instance",
      component: wfNode.type,
      children,
    });
    addedWfNodes.set(wfNode._id, true);
    // Webflow nodes always come with a tag.
    // We support tag only for instances like Heading, not all of them.
    // @todo decide what to do about other instances.
    if (wfNode.tag) {
      fragment.props.push({
        type: "string",
        id: nanoid(),
        instanceId,
        name: "tag",
        value: wfNode.tag,
      });
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
      const parsed = parseCss(`.styles {${style.styleLess}}`);
      for (const style of parsed.styles) {
        fragment.styles.push({
          styleSourceId,
          breakpointId,
          property: style.property,
          value: style.value,
        });
      }
    }
  }

  fragment.children = fragment.instances.map((instance) => ({
    type: "id",
    value: instance.id,
  }));
  return fragment;
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
