import type { Instance, WebstudioFragment } from "@webstudio-is/sdk";
import type { WfNode, WfStyle } from "./schema";
import { nanoid } from "nanoid";
import { $breakpoints } from "~/shared/nano-states";
import { isBaseBreakpoint } from "~/shared/breakpoints";
import { parseCss } from "@webstudio-is/css-data";

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
