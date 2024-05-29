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

const WfNode = z.union([
  z.object({
    _id: z.string(),
    type: z.enum(["Heading"]),
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
};

const addInstances = (
  wfNodes: Map<WfNode["_id"], WfNode>,
  fragment: WebstudioFragment
) => {
  const added = new Map<WfNode["_id"], Instance["id"]>();
  for (const wfNode of wfNodes.values()) {
    if (added.get(wfNode._id) || "text" in wfNode) {
      continue;
    }
    const children: Instance["children"] = [];
    const instanceId = nanoid();

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
        added.set(childId, instanceId);
      }
    }
    fragment.instances.push({
      id: instanceId,
      type: "instance",
      component: wfNode.type,
      children,
    });
    added.set(wfNode._id, instanceId);
  }
  return added;
};

const addProperties = (
  wfNodes: Map<WfNode["_id"], WfNode>,
  added: Map<WfNode["_id"], Instance["id"]>,
  fragment: WebstudioFragment
) => {
  for (const wfNode of wfNodes.values()) {
    // Webflow nodes always come with a tag.
    // We support tag only for instances like Heading, not all of them.
    // @todo decide what to do about other instances.
    if ("tag" in wfNode) {
      const instanceId = added.get(wfNode._id);
      if (instanceId === undefined) {
        console.error("No instance id found - should never happen");
        continue;
      }
      fragment.props.push({
        type: "string",
        id: nanoid(),
        instanceId,
        name: "tag",
        value: wfNode.tag,
      });
    }
  }
};

const toInstanceData = (WfData: WfData) => {
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
    WfData.payload.nodes.map((node: WfNode) => [node._id, node])
  );
  const wfStyles = new Map<WfStyle["_id"], WfStyle>(
    WfData.payload.styles.map((style: WfStyle) => [style._id, style])
  );

  const added = addInstances(wfNodes, fragment);
  addStyles(wfNodes, wfStyles, added, fragment);
  addProperties(wfNodes, added, fragment);

  fragment.children = fragment.instances.map((instance) => ({
    type: "id",
    value: instance.id,
  }));
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
  const WfData = parse(clipboardData);
  if (WfData === undefined) {
    return false;
  }
  const data = toInstanceData(WfData);
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
