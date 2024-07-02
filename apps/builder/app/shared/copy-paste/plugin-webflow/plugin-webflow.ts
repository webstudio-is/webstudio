import type { Instance, WebstudioFragment } from "@webstudio-is/sdk";
import {
  computeInstancesConstraints,
  findAvailableDataSources,
  findClosestDroppableTarget,
  insertInstanceChildrenMutable,
  insertWebstudioFragmentCopy,
  updateWebstudioData,
} from "../../instance-utils";
import {
  $instances,
  $registeredComponentMetas,
  $selectedInstanceSelector,
  $selectedPage,
  $project,
} from "../../nano-states";
import {
  WfData,
  wfNodeTypes,
  type WfNode,
  type WfStyle,
  type WfAsset,
} from "./schema";
import { addInstanceAndProperties } from "./instances-properties";
import { addStyles } from "./styles";
import { builderApi } from "~/shared/builder-api";
import { denormalizeSrcProps } from "../asset-upload";
import { nanoHash } from "~/shared/nano-hash";

const { toast } = builderApi;

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

  const wfAssets = new Map<WfAsset["_id"], WfAsset>(
    wfData.payload.assets.map((asset: WfAsset) => [asset._id, asset])
  );

  // False value used to skip a node.
  const doneNodes = new Map<WfNode["_id"], Instance["id"] | false>();
  for (const wfNode of wfNodes.values()) {
    addInstanceAndProperties(wfNode, doneNodes, wfNodes, fragment);
  }

  /**
   * Generates deterministic style IDs based on sourceId or unique data.
   * This simplifies merging and deduplicating styles from different sources.
   */
  const generateStyleSourceId = async (sourceData: string) => {
    // We are using projectId here to avoid id collisions between different projects.
    const projectId = $project.get()?.id;
    if (projectId === undefined) {
      throw new Error("Project id is not set");
    }
    return nanoHash(`${projectId}-${sourceData}`);
  };

  await addStyles({
    wfNodes,
    wfStyles,
    wfAssets,
    doneNodes,
    fragment,
    generateStyleSourceId,
  });
  // First node should be always the root node in theory, if not
  // we need to find a node that is not a child of any other node.
  const rootWfNode = wfData.payload.nodes[0];
  const rootInstanceId = doneNodes.get(rootWfNode._id);
  if (rootInstanceId === false) {
    return fragment;
  }
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
    const message = `Skipping unsupported elements: ${unsupportedNodeTypes.join(", ")}`;
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
  const wfData = parse(clipboardData);
  if (wfData === undefined) {
    return false;
  }

  let fragment = await toWebstudioFragment(wfData);
  const selectedPage = $selectedPage.get();
  if (fragment === undefined || selectedPage === undefined) {
    return false;
  }

  fragment = await denormalizeSrcProps(fragment);

  const metas = $registeredComponentMetas.get();
  const newInstances = new Map(
    fragment.instances.map((instance) => [instance.id, instance])
  );

  // paste to the root if nothing is selected
  const instanceSelector = $selectedInstanceSelector.get() ?? [
    selectedPage.rootInstanceId,
  ];

  const rootInstanceIds = fragment.children
    .filter((child) => child.type === "id")
    .map((child) => child.value);

  const dropTarget = findClosestDroppableTarget(
    metas,
    $instances.get(),
    instanceSelector,
    computeInstancesConstraints(metas, newInstances, rootInstanceIds)
  );

  if (dropTarget === undefined) {
    return false;
  }

  updateWebstudioData((data) => {
    const { newInstanceIds } = insertWebstudioFragmentCopy({
      data,
      fragment,
      availableDataSources: findAvailableDataSources(
        data.dataSources,
        data.instances,
        instanceSelector
      ),
    });

    const children = fragment.children
      .map((child) => {
        if (child.type === "id") {
          const value = newInstanceIds.get(child.value);
          if (value) {
            return { type: "id" as const, value };
          }
        }
      })
      .filter(<T>(value: T): value is NonNullable<T> => value !== undefined);

    insertInstanceChildrenMutable(data, children, dropTarget);
  });

  return true;
};

export const __testing__ = {
  toWebstudioFragment,
};
