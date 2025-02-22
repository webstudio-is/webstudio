import type {
  Breakpoint,
  Instance,
  WebstudioFragment,
} from "@webstudio-is/sdk";
import type { WfAsset, WfElementNode, WfNode, WfStyle } from "./schema";
import { nanoid } from "nanoid";
import { $styleSources } from "~/shared/nano-states";
import {
  camelCaseProperty,
  parseCss,
  pseudoElements,
  type ParsedStyleDecl,
} from "@webstudio-is/css-data";
import { equalMedia, hyphenateProperty } from "@webstudio-is/css-engine";
import type { WfStylePresets } from "./style-presets-overrides";
import { builderApi } from "~/shared/builder-api";
import { url } from "css-tree";
import { mapGroupBy } from "~/shared/shim";

const { toast } = builderApi;

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
const wfBreakpointByMediaQuery = new Map<undefined | string, WfBreakpointName>([
  [undefined, "base"],
  ["(min-width:1920px)", "xxl"],
  ["(min-width:1440px)", "xl"],
  ["(min-width:1280px)", "large"],
  ["(max-width:991px)", "medium"],
  ["(max-width:767px)", "small"],
  ["(max-width:479px)", "tiny"],
]);

const parseVariantName = (variant: string) => {
  let [breakpointName, state = ""] = variant.split("_");
  if (state) {
    const separator = pseudoElements.includes(
      state as (typeof pseudoElements)[number]
    )
      ? "::"
      : ":";
    state = separator + state;
  }
  if (wfBreakpoints.has(breakpointName as WfBreakpointName) === false) {
    if (breakpointName !== "main") {
      console.error(`Invalid breakpoint name: ${breakpointName}`);
    }
    breakpointName = "base";
  }

  return {
    breakpointName: breakpointName as WfBreakpointName,
    state,
  };
};

// Apparently webflow supports this variable notation: `color: @var_relume-variable-color-neutral-1`
// Until actual variables are supported, we need to replace it with "unset",
// otherwise property will be skipped and that will result in an inherited value, which is more problematic.
// @todo use CSS variables once this is done https://github.com/webstudio-is/webstudio/issues/3399
const replaceAtVariables = (styles: string) => {
  return styles.replace(/@var_[\w-]+/g, "unset");
};

// Converts webflow asset references like `@img_667d0b7769e0cc3754b584f6` to valid urls like
// url("https://667d0b7769e0cc3754b584f6") to not break csstree parser
const replaceAtImages = (
  styles: string,
  wfAssets: Map<WfAsset["_id"], WfAsset>
) => {
  return styles.replace(/@img_[\w-]+/g, (match) => {
    const assetId = match.slice(5);
    const asset = wfAssets.get(assetId);

    if (asset === undefined) {
      if (assetId !== "example_bg") {
        console.error(`Asset not found: ${assetId}`);
      }
      return `none`;
    }

    return url.encode(asset.s3Url);
  });
};

const processStyles = (parsedStyles: ParsedStyleDecl[]) => {
  const styles = new Map<string, ParsedStyleDecl>();
  for (const parsedStyleDecl of parsedStyles) {
    const { breakpoint, selector, state, property } = parsedStyleDecl;
    const key = `${breakpoint}:${selector}:${state}:${property}`;
    styles.set(key, parsedStyleDecl);
  }
  for (const parsedStyleDecl of styles.values()) {
    const { breakpoint, selector, state, property } = parsedStyleDecl;
    const key = `${breakpoint}:${selector}:${state}:${property}`;
    styles.set(key, parsedStyleDecl);
    if (property === "background-clip") {
      const colorKey = `${breakpoint}:${selector}:${state}:color`;
      styles.delete(colorKey);
      styles.set(colorKey, {
        ...parsedStyleDecl,
        property: "color",
        value: { type: "keyword", value: "transparent" },
      });
    }
  }
  return Array.from(styles.values());
};

type UnparsedVariants = Map<string, string | Array<ParsedStyleDecl>>;

// Variants value can be wf styleLess string which is a styles block
// or it can be an array of EmbedTemplateStyleDecl.
// If its an array, convert it to ws style decl.
const toParsedVariants = (variants: UnparsedVariants) => {
  const parsedVariants = new Map<WfBreakpointName, Array<ParsedStyleDecl>>();
  for (const [variant, styles] of variants) {
    const { breakpointName, state } = parseVariantName(variant);
    if (typeof styles === "string") {
      try {
        const sanitizedStyles = styles.replaceAll(/@raw<\|([^@]+)\|>/g, "$1");
        const parsed = processStyles(
          parseCss(`.styles${state} {${sanitizedStyles}}`) ?? []
        );
        const allBreakpointStyles = parsedVariants.get(breakpointName) ?? [];
        allBreakpointStyles.push(...parsed);
        parsedVariants.set(breakpointName, allBreakpointStyles);
      } catch (error) {
        console.error("Failed to parse style", error, breakpointName, styles);
      }
      continue;
    }
    parsedVariants.set(breakpointName, styles);
  }

  return parsedVariants;
};

const addNodeStyles = ({
  styleSourceId,
  variants,
  fragment,
}: {
  styleSourceId: string;
  variants: UnparsedVariants;
  fragment: WebstudioFragment;
}) => {
  const parsedVariants = toParsedVariants(variants);
  for (const [wfBreakpointName, styles] of parsedVariants) {
    if (styles.length === 0) {
      // We don't want to add breakpoints if there are no styles defined on them
      continue;
    }
    const wfBreakpoint = wfBreakpoints.get(wfBreakpointName);
    if (wfBreakpoint === undefined) {
      console.error(`Unknown breakpoint "${wfBreakpointName}"`);
      continue;
    }
    let breakpoint = fragment.breakpoints.find((breakpoint) => {
      return equalMedia(breakpoint, wfBreakpoint);
    });

    if (breakpoint === undefined) {
      breakpoint = {
        id: nanoid(),
        label: wfBreakpointName,
        ...(wfBreakpoint.minWidth !== undefined && {
          minWidth: wfBreakpoint.minWidth,
        }),
        ...(wfBreakpoint.maxWidth !== undefined && {
          maxWidth: wfBreakpoint.maxWidth,
        }),
      } satisfies Breakpoint;
      fragment.breakpoints.push(breakpoint);
    }

    for (const style of styles) {
      fragment.styles.push({
        styleSourceId,
        breakpointId: breakpoint.id,
        property: camelCaseProperty(style.property),
        value: style.value,
        state: style.state,
      });
      if (style.value.type === "invalid") {
        const error = `Invalid style value: Local "${hyphenateProperty(style.property)}: ${style.value.value}"`;
        toast.error(error);
        console.error(error);
      }
    }
  }
};

const addStyleSource = (
  styleSourceId: string,
  instanceId: Instance["id"],
  fragment: WebstudioFragment
) => {
  let styleSourceSelection = fragment.styleSourceSelections.find(
    (selection) => selection.instanceId === instanceId
  );
  if (styleSourceSelection === undefined) {
    styleSourceSelection = { instanceId, values: [] };
    fragment.styleSourceSelections.push(styleSourceSelection);
  }

  if (styleSourceSelection.values.includes(styleSourceId) === false) {
    styleSourceSelection.values.push(styleSourceId);
  }
};

const addNodeTokenStyles = ({
  styleSourceId,
  name,
  variants,
  instanceId,
  fragment,
}: {
  styleSourceId: string;
  name: string;
  variants: UnparsedVariants;
  instanceId: Instance["id"];
  fragment: WebstudioFragment;
}) => {
  fragment.styleSources.push({
    type: "token",
    id: styleSourceId,
    name,
  });

  addStyleSource(styleSourceId, instanceId, fragment);

  addNodeStyles({
    styleSourceId,
    variants,
    fragment,
  });
};

const addNodeLocalStyles = ({
  styleSourceId,
  style,
  instanceId,
  fragment,
}: {
  styleSourceId: string;
  style: NonNullable<WfElementNode["data"]>["style"];
  instanceId: Instance["id"];
  fragment: WebstudioFragment;
}) => {
  let hasLocalStyles = false;
  const instanceDataVariants = new Map<string, string>();
  // @todo we don't know what is base, maybe the opposite of cringe?
  for (const baseStyle of Object.values(style ?? {})) {
    for (const [breakpoint, breakpointStyle] of Object.entries(baseStyle)) {
      let css = ``;
      // @todo we don't know format for pseudo
      // because webflow does not set styles on pseudo
      // in quick stack instance
      for (const pseudoStyle of Object.values(breakpointStyle)) {
        for (const [property, value] of Object.entries(pseudoStyle)) {
          hasLocalStyles = true;
          css += `${hyphenateProperty(property)}: ${value};`;
        }
      }
      instanceDataVariants.set(breakpoint, css);
    }
  }
  if (hasLocalStyles === false) {
    return;
  }

  fragment.styleSources.push({
    type: "local",
    id: styleSourceId,
  });
  let styleSourceSelection = fragment.styleSourceSelections.find(
    (selection) => selection.instanceId === instanceId
  );
  if (styleSourceSelection === undefined) {
    styleSourceSelection = { instanceId, values: [] };
    fragment.styleSourceSelections.push(styleSourceSelection);
  }
  styleSourceSelection.values.push(styleSourceId);

  addNodeStyles({
    styleSourceId,
    variants: instanceDataVariants,
    fragment,
  });
};

const mapComponentAndPresetStyles = (
  wfNode: WfElementNode,
  stylePresets: WfStylePresets
) => {
  const component = wfNode.type;
  const presetStyles: Array<keyof WfStylePresets> = [];

  if (wfNode.tag in stylePresets) {
    presetStyles.push(wfNode.tag as keyof typeof stylePresets);
  }

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
    case "BlockContainer": {
      presetStyles.push("w-layout-blockcontainer");
      presetStyles.push("w-container");
      return presetStyles;
    }
    case "Row": {
      presetStyles.push("w-row");
      return presetStyles;
    }
    case "Cell": {
      presetStyles.push("w-layout-cell");
      return presetStyles;
    }
    case "Column": {
      // @todo wf has w-col-1 etc in grid
      presetStyles.push("w-col");
      return presetStyles;
    }
    case "Grid": {
      presetStyles.push("w-layout-grid");
      return presetStyles;
    }
    case "Layout": {
      presetStyles.push("w-layout-layout");
      presetStyles.push("wf-layout-layout");
      return presetStyles;
    }
    case "HFlex": {
      presetStyles.push("w-layout-hflex");
      return presetStyles;
    }
    case "VFlex": {
      presetStyles.push("w-layout-vflex");
      return presetStyles;
    }
    case "FormWrapper": {
      presetStyles.push("w-form");
      return presetStyles;
    }
    case "FormTextInput":
    case "FormTextarea": {
      presetStyles.push("w-input");
      return presetStyles;
    }
    case "FormButton": {
      presetStyles.push("w-button");
      return presetStyles;
    }
    case "FormCheckboxWrapper": {
      presetStyles.push("w-checkbox");
      return presetStyles;
    }
    case "FormCheckboxInput": {
      presetStyles.push("w-checkbox-input");
      return presetStyles;
    }
    case "FormInlineLabel": {
      presetStyles.push("w-form-label");
      return presetStyles;
    }
    case "FormRadioWrapper": {
      presetStyles.push("w-radio");
      return presetStyles;
    }
    case "FormRadioInput": {
      presetStyles.push("w-radio-input");
      return presetStyles;
    }

    case "Icon": {
      const data = wfNode.data;

      if (data.widget?.icon) {
        presetStyles.push(`w-icon-${data.widget.icon}`);
      }
      return presetStyles;
    }

    case "NavbarMenu":
      presetStyles.push("w-nav-menu");
      return presetStyles;

    case "NavbarContainer":
      presetStyles.push("w-container");
      return presetStyles;

    case "NavbarWrapper":
      presetStyles.push("w-nav");
      return presetStyles;

    case "NavbarBrand":
      presetStyles.push("w-nav-brand");
      return presetStyles;

    case "NavbarLink":
      presetStyles.push("w-nav-link");
      return presetStyles;

    case "NavbarButton":
      presetStyles.push("w-nav-button");
      return presetStyles;
  }

  return presetStyles;
};

// Merges wf styles that are combo classes into a single style.
// Checks if a style source with that name already exists and the new one has new styles and is not empty - if so, adds a number to a name.
const mergeComboStyles = (wfStyles: Array<WfStyle>) => {
  const classes = new Set<string>();
  const skip = new Set<string>();
  let mergedStyle;
  for (const wfStyle of wfStyles) {
    const { name } = wfStyle;

    classes.add(name);

    if (mergedStyle === undefined) {
      mergedStyle = { variants: {}, ...wfStyle, name };
      continue;
    }

    const comboClass = mergedStyle.name + "." + name;

    // We need to avoid creating combo classes when they have no additional styles.
    if (wfStyle.comb === "&" && wfStyle.styleLess === "") {
      skip.add(comboClass);
      continue;
    }

    mergedStyle.styleLess += wfStyle.styleLess;
    mergedStyle.name = comboClass;
    for (const key in wfStyle.variants) {
      if (key in mergedStyle.variants === false) {
        mergedStyle.variants[key] = { styleLess: "" };
      }
      mergedStyle.variants[key].styleLess += wfStyle.variants[key];
    }
  }

  const classesArray = Array.from(classes);
  // Produce all possible combinations of combo classes so we can check later if they alredy exist.
  // This is needed to achieve the same end-result as with combo-classes in webflow.
  // Example .a.b.c -> .a, .b, .c, .a.b, .a.c, .b.c, .a.b.c
  const comboClasses = classesArray
    .flatMap((name1) => classesArray.map((name2) => `${name1}.${name2}`))
    .filter((name) => skip.has(name) === false);

  return {
    mergedStyle,
    classes: classesArray,
    comboClasses,
  };
};

export const addStyles = async ({
  wfNodes,
  wfStyles,
  wfAssets,
  doneNodes,
  fragment,
  generateStyleSourceId,
}: {
  wfNodes: Map<WfNode["_id"], WfNode>;
  wfStyles: Map<WfStyle["_id"], WfStyle>;
  wfAssets: Map<WfAsset["_id"], WfAsset>;
  doneNodes: Map<WfNode["_id"], Instance["id"] | false>;
  fragment: WebstudioFragment;
  generateStyleSourceId: (sourceData: string) => Promise<string>;
}) => {
  const { stylePresets } = await import("./style-presets-overrides");

  for (const wfNode of wfNodes.values()) {
    if ("text" in wfNode) {
      continue;
    }
    const instanceId = doneNodes.get(wfNode._id);
    if (instanceId === false) {
      continue;
    }
    if (instanceId === undefined) {
      console.error(`No instance id found for node ${wfNode._id}`);
      continue;
    }

    for (const name of mapComponentAndPresetStyles(wfNode, stylePresets)) {
      addNodeTokenStyles({
        styleSourceId: await generateStyleSourceId(name),
        name,
        variants: new Map(
          Array.from(
            mapGroupBy(
              stylePresets[name] as Array<ParsedStyleDecl>,
              (item) => item.breakpoint
            ),
            ([mediaQuery, value]) => [
              wfBreakpointByMediaQuery.get(mediaQuery) ?? "base",
              value,
            ]
          )
        ),
        instanceId,
        fragment,
      });
    }

    addNodeLocalStyles({
      styleSourceId: await generateStyleSourceId(wfNode._id),
      style: wfNode.data?.style,
      instanceId,
      fragment,
    });

    const instance = fragment.instances.find(
      (instance) => instance.id === instanceId
    );

    if (instance === undefined) {
      console.error(`No instance found for ${instanceId}`);
      continue;
    }

    const wfNodeStyles = wfNode.classes
      .map((classId) => wfStyles.get(classId))
      .filter(<T>(value: T): value is NonNullable<T> => value !== undefined);

    const stylesMerge = mergeComboStyles(wfNodeStyles);
    const wfStyle = stylesMerge.mergedStyle;
    if (wfStyle === undefined) {
      continue;
    }
    if (instance && instance.label === undefined) {
      instance.label = wfStyle.name;
    }

    const variants = new Map();
    variants.set(
      "base",
      replaceAtImages(replaceAtVariables(wfStyle.styleLess), wfAssets)
    );
    const wfVariants = wfStyle.variants;
    Object.keys(wfVariants).forEach((breakpointName) => {
      const variant = wfVariants[breakpointName as keyof typeof wfVariants];
      if (variant && "styleLess" in variant) {
        variants.set(
          breakpointName,
          replaceAtImages(replaceAtVariables(variant.styleLess), wfAssets)
        );
      }
    });

    // We need to see if the individual classes have already existed in the system
    // and if so, add them to the selection, because webflow relies on combo class logic and we merge the combo into one.
    const addExistingStyleSources = async (classes: Array<string>) => {
      for (const className of classes) {
        const styleSourceId = await generateStyleSourceId(className);
        if ($styleSources.get().has(styleSourceId)) {
          addStyleSource(styleSourceId, instanceId, fragment);
        }
      }
    };

    // First go individual classes: .a, .b, .c
    await addExistingStyleSources(stylesMerge.classes);

    // Second goes merged combo class .a.b.c
    addNodeTokenStyles({
      styleSourceId: await generateStyleSourceId(wfStyle.name),
      name: wfStyle.name,
      variants,
      instanceId,
      fragment,
    });

    // Third goes .a.b, .b.c
    // This worder is arbitrary and seems to be most likely to match webflow,
    // but it can be wrong sometimes.
    // Source order specificity in Webflow is a mess.
    await addExistingStyleSources(stylesMerge.comboClasses);
  }
};
