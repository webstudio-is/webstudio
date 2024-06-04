import type { Instance, WebstudioFragment } from "@webstudio-is/sdk";
import type { WfNode, WfStyle } from "./schema";
import { nanoid } from "nanoid";
import { $breakpoints } from "~/shared/nano-states";
import { isBaseBreakpoint } from "~/shared/breakpoints";
import { parseCss } from "@webstudio-is/css-data";
import { presets } from "./style-presets";

const addNodeStyles = (
  name: string,
  styleBlock: string,
  instanceId: Instance["id"],
  fragment: WebstudioFragment
) => {
  const breakpointId = Array.from($breakpoints.get().values()).find(
    isBaseBreakpoint
  )?.id;
  if (breakpointId === undefined) {
    console.error("No base breakpoint found - should never happen");
    return;
  }

  const styleSourceId = nanoid();
  fragment.styleSources.push({
    type: "token",
    id: styleSourceId,
    name,
  });

  let styleSourceSelection = fragment.styleSourceSelections.find(
    (selection) => selection.instanceId === instanceId
  );
  if (styleSourceSelection === undefined) {
    styleSourceSelection = { instanceId, values: [] };
    fragment.styleSourceSelections.push(styleSourceSelection);
  }
  styleSourceSelection.values.push(styleSourceId);

  try {
    const styles = parseCss(`.styles {${styleBlock}}`).styles ?? [];
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
    console.error("Failed to parse style", error, styleBlock);
  }
};

export const addStyles = (
  wfNodes: Map<WfNode["_id"], WfNode>,
  wfStyles: Map<WfStyle["_id"], WfStyle>,
  added: Map<WfNode["_id"], Instance["id"]>,
  fragment: WebstudioFragment
) => {
  for (const wfNode of wfNodes.values()) {
    if ("text" in wfNode) {
      continue;
    }
    const instanceId = added.get(wfNode._id);
    if (instanceId === undefined) {
      console.error(`No instance id found for node ${wfNode._id}`);
      continue;
    }

    const preset = presets[wfNode.tag as keyof typeof presets];

    if (preset) {
      addNodeStyles(wfNode.tag, preset, instanceId, fragment);
    }

    for (const classId of wfNode.classes) {
      const style = wfStyles.get(classId);
      if (style) {
        addNodeStyles(style.name, style.styleLess, instanceId, fragment);
      }
    }
  }
};
