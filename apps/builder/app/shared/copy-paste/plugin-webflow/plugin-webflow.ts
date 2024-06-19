import type { Instance, WebstudioFragment } from "@webstudio-is/sdk";
import {
  computeInstancesConstraints,
  findClosestDroppableTarget,
  insertTemplateData,
} from "../../instance-utils";
import {
  $instances,
  $registeredComponentMetas,
  $selectedInstanceSelector,
  $selectedPage,
} from "../../nano-states";
import { isFeatureEnabled } from "@webstudio-is/feature-flags";
import { WfData, WfNode, WfStyle, wfNodeTypes } from "./schema";
import { addInstanceAndProperties } from "./instances-properties";
import { addStyles } from "./styles";
import { toast } from "@webstudio-is/design-system";
import { denormalizeSrcProps } from "../asset-upload";

export const mimeType = "application/json";

const toWebstudioFragment = async (wfData: WfData) => {
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
  await addStyles(wfNodes, wfStyles, added, fragment);
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
  let data;
  try {
    data = JSON.parse(clipboardData);
  } catch {
    return;
  }

  if (data.type !== "@webflow/XscpData") {
    return;
  }

  const unsupportedNodeTypes: Array<string> = data.payload.nodes
    .filter((node: { type: string }) => {
      return (
        node.type !== undefined &&
        wfNodeTypes.includes(node.type as (typeof wfNodeTypes)[number]) ===
          false
      );
    })
    .map((node: { type: string }) => node.type);

  if (unsupportedNodeTypes.length !== 0) {
    const message = `Skipping unsupported nodes: ${unsupportedNodeTypes.join(", ")}`;
    toast.info(message);
    console.info(message);
  }

  const result = WfData.safeParse(data);

  if (result.success) {
    return result.data;
  }

  toast.error(result.error.message);
  console.error(result.error.message);
};

export const onPaste = async (clipboardData: string) => {
  if (isFeatureEnabled("pasteFromWebflow") === false) {
    return false;
  }
  const wfData = parse(clipboardData);
  if (wfData === undefined) {
    return false;
  }
  let fragment = await toWebstudioFragment(wfData);
  const selectedPage = $selectedPage.get();
  if (fragment.instances.length === 0 || selectedPage === undefined) {
    return false;
  }

  fragment = await denormalizeSrcProps(fragment);

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
