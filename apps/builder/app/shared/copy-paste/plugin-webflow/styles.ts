import type {
  Breakpoints,
  Instance,
  WebstudioFragment,
} from "@webstudio-is/sdk";
import type { WfElementNode, WfNode, WfStyle } from "./schema";
import { nanoid } from "nanoid";
import { $breakpoints } from "~/shared/nano-states";
import { parseCss } from "@webstudio-is/css-data";
// @todo this should be moved
import type { EmbedTemplateStyleDecl } from "@webstudio-is/react-sdk";
import { toast } from "@webstudio-is/design-system";
import { kebabCase } from "change-case";
import { equalMedia } from "@webstudio-is/css-engine";
import { isBaseBreakpoint } from "~/shared/breakpoints";

type WfBreakpoint = { minWidth?: number; maxWidth?: number };

type WfBreakpointName =
  | "base"
  | "xxl"
  | "xl"
  | "large"
  | "medium"
  | "small"
  | "tiny";

const wfBreakpoints = new Map<WfBreakpointName, WfBreakpoint>([
  ["base", {}],
  ["xxl", { minWidth: 1920 }],
  ["xl", { minWidth: 1440 }],
  ["large", { minWidth: 1280 }],
  ["medium", { maxWidth: 991 }],
  ["small", { maxWidth: 767 }],
  ["tiny", { maxWidth: 479 }],
]);

const findWsBreakpoint = (
  wfBreakpoint: WfBreakpoint,
  breakpoints: Breakpoints
) => {
  return Array.from($breakpoints.get().values()).find((breakpoint) => {
    return equalMedia(breakpoint, wfBreakpoint);
  });
};

const addNodeStyles = ({
  name,
  variants,
  instanceId,
  fragment,
}: {
  name: string;
  variants: Map<WfBreakpointName, string | Array<EmbedTemplateStyleDecl>>;
  instanceId: Instance["id"];
  fragment: WebstudioFragment;
}) => {
  const parsedVariants = new Map<
    WfBreakpointName,
    Array<EmbedTemplateStyleDecl>
  >();

  // variants value can be styleLess string which is a css rule styles block
  // or it can be an array of EmbedTemplateStyleDecl
  // if its an array, convert it to ws style decl.
  for (const [breakpointName, styles] of variants) {
    if (typeof styles === "string") {
      try {
        const parsed = parseCss(`.styles {${styles}}`).styles ?? [];
        parsedVariants.set(breakpointName, parsed);
      } catch (error) {
        console.error("Failed to parse style", error, breakpointName, styles);
      }
      continue;
    }
    parsedVariants.set(breakpointName, styles);
  }

  // Creates a map of wf breakpoint name to ws breakpoint id:
  // { "xxl" => "1123456", ... }
  const wfBreakpointNameToId = new Map();
  for (const [wfBreakpointName, wfBreakpoint] of wfBreakpoints) {
    if (wfBreakpointName === "base") {
      const baseBreakpoint = Array.from($breakpoints.get().values()).find(
        isBaseBreakpoint
      );
      if (baseBreakpoint) {
        wfBreakpointNameToId.set(wfBreakpointName, baseBreakpoint.id);
      }
      continue;
    }

    const wsBreakpoint = findWsBreakpoint(wfBreakpoint, $breakpoints.get());
    if (wsBreakpoint) {
      wfBreakpointNameToId.set(wfBreakpointName, wsBreakpoint.id);
      continue;
    }
    // @todo Here create a webstudio breakpoint if it doesn't exist
    wfBreakpointNameToId.set(wfBreakpointName, "new");
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

  console.log(222, parsedVariants);

  for (const [breakpointName, styles] of parsedVariants) {
    const breakpointId = wfBreakpointNameToId.get(breakpointName);

    if (breakpointId === undefined) {
      console.error(`No breakpoint id found for ${breakpointName} `);
      continue;
    }
    // @todo handle breakpointId "new" case
    if (breakpointId === "new") {
      console.error(`Implement adding a new breakpoint`);
      continue;
    }

    for (const style of styles) {
      fragment.styles.push({
        styleSourceId,
        breakpointId,
        property: style.property,
        value: style.value,
        state: style.state,
      });
      if (style.value.type === "invalid") {
        const error = `Invalid style value: "${kebabCase(style.property)}: ${style.value.value}"`;
        toast.error(error);
        console.error(error);
      }
    }
  }
};

const mapComponentAndPresetStyles = (wfNode: WfElementNode) => {
  const component = wfNode.type;
  const presetStyles = [wfNode.tag];

  switch (component) {
    case "Link": {
      const data = wfNode.data;
      if (data.button) {
        presetStyles.push("w-button");
      }
      if (data.block === "inline") {
        presetStyles.push("w-inline-block");
      }
      return presetStyles;
    }
    case "CodeBlock": {
      presetStyles.push("w-code-block");
      return presetStyles;
    }
    case "HtmlEmbed": {
      presetStyles.push("w-embed");
      return presetStyles;
    }
    //case "Form": {
    //  presetStyles.push("w-form");
    //  return presetStyles;
    //}
    case "BlockContainer": {
      presetStyles.push("w-container");
      return presetStyles;
    }
    case "Row": {
      presetStyles.push("w-row");
      return presetStyles;
    }
    case "Column": {
      presetStyles.push("w-col");
      return presetStyles;
    }
  }

  return presetStyles;
};

export const addStyles = async (
  wfNodes: Map<WfNode["_id"], WfNode>,
  wfStyles: Map<WfStyle["_id"], WfStyle>,
  added: Map<WfNode["_id"], Instance["id"]>,
  fragment: WebstudioFragment
) => {
  const { default: presets } = await import("./__generated__/style-presets");

  for (const wfNode of wfNodes.values()) {
    if ("text" in wfNode) {
      continue;
    }
    const instanceId = added.get(wfNode._id);
    if (instanceId === undefined) {
      console.error(`No instance id found for node ${wfNode._id}`);
      continue;
    }

    mapComponentAndPresetStyles(wfNode).forEach((name) => {
      const styles = presets[
        name as keyof typeof presets
      ] as Array<EmbedTemplateStyleDecl>;
      if (styles) {
        addNodeStyles({
          name,
          variants: new Map([["base", styles]]),
          instanceId,
          fragment,
        });
      }
    });

    const instance = fragment.instances.find(
      (instance) => instance.id === instanceId
    );

    if (instance === undefined) {
      console.error(`No instance found for ${instanceId}`);
      continue;
    }

    for (const classId of wfNode.classes) {
      const style = wfStyles.get(classId);
      if (style === undefined) {
        continue;
      }
      if (instance && instance.label === undefined) {
        instance.label = style.name;
      }
      const variants = new Map();
      variants.set("base", style.styleLess);
      const wfVariants = style.variants ?? {};
      Object.keys(wfVariants).forEach((breakpointName) => {
        const variant = wfVariants[breakpointName as keyof typeof wfVariants];
        if (variant && "styleLess" in variant) {
          variants.set(breakpointName, variant.styleLess);
        }
      });
      addNodeStyles({
        name: style.name,
        variants,
        instanceId,
        fragment,
      });
    }
  }
};
