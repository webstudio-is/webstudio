import type { Instance, WebstudioFragment } from "@webstudio-is/sdk";
import { findClosestInsertable } from "../../instance-utils/insert";
import { $project, $styleSources } from "~/shared/sync/data-stores";
import {
  type WfData,
  wfData,
  wfNodeTypes,
  type WfNode,
  type WfStyle,
  type WfAsset,
} from "@webstudio-is/project-build/transfer";
import { addInstanceAndProperties } from "@webstudio-is/project-build/transfer";
import { addStyles } from "@webstudio-is/project-build/transfer";
import { builderApi } from "~/shared/builder-api";
import { denormalizeSrcProps } from "../asset-upload";
import { nanoHash } from "~/shared/nano-hash";
import { pasteHandled, pasteIgnored, type Plugin } from "../copy-paste";
import { builderRuntimeContext } from "@webstudio-is/project-build/runtime";
import {
  hasFragmentData,
  insertFragmentWithBreakpointWarning,
} from "../fragment-utils";

const { toast } = builderApi;

const toWebstudioFragment = async (
  wfData: WfData,
  createId = builderRuntimeContext.createId
) => {
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
    addInstanceAndProperties(wfNode, doneNodes, wfNodes, fragment, createId);
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
    createId,
    existingStyleSourceIds: new Set($styleSources.get().keys()),
    onInvalidStyleValue: (message) => {
      toast.error(message);
    },
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

type WebflowParseResult =
  | { owned: false }
  | { owned: true; success: false; error: string }
  | { owned: true; success: true; data: WfData };

const parse = (clipboardData: string): WebflowParseResult => {
  let data;
  try {
    data = JSON.parse(clipboardData);
  } catch {
    return { owned: false };
  }

  if (data.type !== "@webflow/XscpData") {
    return { owned: false };
  }

  const payloadNodes = Array.isArray(data.payload?.nodes)
    ? data.payload.nodes
    : [];
  const unsupportedNodeTypes: Set<string> = new Set(
    payloadNodes
      .filter((node: { type: string }) => {
        return (
          node.type !== undefined &&
          wfNodeTypes.includes(node.type as (typeof wfNodeTypes)[number]) ===
            false
        );
      })
      .map((node: { type: string }) => node.type)
  );

  if (unsupportedNodeTypes.size !== 0) {
    const message = `Skipping unsupported elements: ${[...unsupportedNodeTypes.values()].join(", ")}`;
    toast.info(message);
    console.info(message);
  }

  const result = wfData.safeParse(data);

  if (result.success) {
    const unparsedTypes = new Set<string>();

    for (let i = 0; i !== result.data.payload.nodes.length; ++i) {
      if ("type" in result.data.payload.nodes[i]) {
        continue;
      }

      if (data.payload.nodes[i].type === undefined) {
        continue;
      }

      const probablyUnparsedType = data.payload.nodes[i].type;

      if (unsupportedNodeTypes.has(probablyUnparsedType)) {
        continue;
      }

      unparsedTypes.add(probablyUnparsedType);
    }

    if (unparsedTypes.size !== 0) {
      const message = `The following types were skipped due to a parsing error: ${[...unparsedTypes.values()].join(", ")}`;
      toast.info(message);
      console.info(message);
    }

    return { owned: true, success: true, data: result.data };
  }

  return { owned: true, success: false, error: result.error.message };
};

const handlePasteWebflow = async (clipboardData: string) => {
  const project = $project.get();
  const result = parse(clipboardData);
  if (result.owned === false) {
    return pasteIgnored;
  }
  if (result.success === false) {
    return { success: false, error: result.error } as const;
  }
  if (project === undefined) {
    return pasteHandled;
  }

  let fragment = await toWebstudioFragment(result.data);
  if (hasFragmentData(fragment) === false) {
    return pasteHandled;
  }
  fragment = await denormalizeSrcProps(fragment);

  const insertable = findClosestInsertable(fragment);
  if (insertable === undefined) {
    return pasteHandled;
  }

  insertFragmentWithBreakpointWarning(fragment, insertable);
  return pasteHandled;
};

export const webflow: Plugin = {
  name: "webflow",
  mimeType: "application/json",
  onPaste: handlePasteWebflow,
};

export const __testing__ = {
  toWebstudioFragment,
};
