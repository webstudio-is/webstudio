import { createGenerator } from "@unocss/core";
import { presetLegacyCompat } from "@unocss/preset-legacy-compat";
import { presetWind3 } from "@unocss/preset-wind3";
import {
  camelCaseProperty,
  parseCss,
  parseMediaQuery,
  type ParsedStyleDecl,
} from "@webstudio-is/css-data";
import {
  getStyleDeclKey,
  type Instance,
  type Prop,
  type WebstudioFragment,
} from "@webstudio-is/sdk";
import { isBaseBreakpoint } from "../nano-states";
import { preflight } from "./__generated__/preflight";

const createUnoGenerator = async () => {
  return await createGenerator({
    presets: [
      presetWind3({
        // css variables are defined on the same element as style
        preflight: "on-demand",
        // dark mode will be ignored by parser
        dark: "media",
      }),
      // until we support oklch natively
      presetLegacyCompat({ legacyColorSpace: true }),
    ],
  });
};

const parseTailwindClasses = async (classes: string) => {
  // avoid caching uno generator instance
  // to prevent bloating css with preflights from previous calls
  const generator = await createUnoGenerator();
  const generated = await generator.generate(classes);
  const css = generated.css;
  let parsedStyles: Omit<ParsedStyleDecl, "selector">[] = [];
  // @todo probably builtin in v4
  if (css.includes("border")) {
    // Allow adding a border to an element by just adding a border-width. (https://github.com/tailwindcss/tailwindcss/pull/116)
    // [UnoCSS]: allow to override the default border color with css var `--un-default-border-color`
    const reset = `.styles {
      border-style: solid;
      border-color: var(--un-default-border-color, #e5e7eb);
      border-width: 0;
    }`;
    parsedStyles.push(...parseCss(reset));
  }
  parsedStyles.push(...parseCss(css));
  // skip preflights with ::before, ::after and ::backdrop
  parsedStyles = parsedStyles.filter(
    (styleDecl) => !styleDecl.state?.startsWith("::")
  );
  const newClasses = classes
    .split(" ")
    .filter((item) => !generated.matched.has(item))
    .join(" ");
  return { newClasses: newClasses, parsedStyles };
};

const getUniqueIdForList = <List extends Array<{ id: string }>>(list: List) => {
  const existingIds = list.map((item) => item.id);
  let index = 0;
  while (existingIds.includes(index.toString())) {
    index += 1;
  }
  return index.toString();
};

export const generateFragmentFromTailwind = async (
  fragment: WebstudioFragment
): Promise<WebstudioFragment> => {
  // lazily create breakpoint
  let breakpoints = fragment.breakpoints;
  const getBreakpointId = (mediaQuery: undefined | string) => {
    if (mediaQuery === undefined) {
      let baseBreakpoint = breakpoints.find(isBaseBreakpoint);
      if (baseBreakpoint === undefined) {
        baseBreakpoint = { id: "base", label: "" };
        breakpoints = [...breakpoints];
        breakpoints.push(baseBreakpoint);
      }
      return baseBreakpoint.id;
    }
    const parsedMediaQuery = parseMediaQuery(mediaQuery);
    // unknown breakpoint
    if (parsedMediaQuery === undefined) {
      return;
    }
    let breakpoint = breakpoints.find(
      (item) =>
        item.minWidth === parsedMediaQuery.minWidth &&
        item.maxWidth === parsedMediaQuery.maxWidth
    );
    if (breakpoint === undefined) {
      const label = `${parsedMediaQuery.minWidth ?? parsedMediaQuery.maxWidth}`;
      breakpoint = {
        // make sure new breakpoint id is not conflicted with already defined by fragment
        id: getUniqueIdForList(breakpoints),
        label,
        ...parsedMediaQuery,
      };
      breakpoints = [...breakpoints];
      breakpoints.push(breakpoint);
    }
    return breakpoint.id;
  };

  const styleSourceSelections = new Map(
    fragment.styleSourceSelections.map((item) => [item.instanceId, item])
  );
  const styleSources = new Map(
    fragment.styleSources.map((item) => [item.id, item])
  );
  const styles = new Map(
    fragment.styles.map((item) => [getStyleDeclKey(item), item])
  );
  const getLocalStyleSource = (instanceId: Instance["id"]) => {
    const styleSourceSelection = styleSourceSelections.get(instanceId);
    const lastStyleSourceId = styleSourceSelection?.values.at(-1);
    const lastStyleSource = styleSources.get(lastStyleSourceId ?? "");
    return lastStyleSource?.type === "local" ? lastStyleSource : undefined;
  };
  const createLocalStyleSource = (instanceId: Instance["id"]) => {
    const localStyleSource = {
      type: "local" as const,
      id: `${instanceId}:ws:style`,
    };
    let styleSourceSelection = structuredClone(
      styleSourceSelections.get(instanceId)
    );
    if (styleSourceSelection === undefined) {
      styleSourceSelection = { instanceId: instanceId, values: [] };
      styleSourceSelections.set(instanceId, styleSourceSelection);
    }
    styleSources.set(localStyleSource.id, localStyleSource);
    styleSourceSelection.values.push(localStyleSource.id);
    return localStyleSource;
  };
  const createOrMergeLocalStyles = (
    instanceId: Instance["id"],
    newStyles: Omit<ParsedStyleDecl, "selector">[]
  ) => {
    const localStyleSource =
      getLocalStyleSource(instanceId) ?? createLocalStyleSource(instanceId);
    for (const parsedStyleDecl of newStyles) {
      const breakpointId = getBreakpointId(parsedStyleDecl.breakpoint);
      // ignore unknown breakpoints
      if (breakpointId === undefined) {
        continue;
      }
      const styleDecl = {
        breakpointId,
        styleSourceId: localStyleSource.id,
        state: parsedStyleDecl.state,
        property: camelCaseProperty(parsedStyleDecl.property),
        value: parsedStyleDecl.value,
      };
      const styleDeckKey = getStyleDeclKey(styleDecl);
      styles.delete(styleDeckKey);
      styles.set(styleDeckKey, styleDecl);
    }
  };

  for (const instance of fragment.instances) {
    const tag = instance.tag;
    if (tag && preflight[tag]) {
      createOrMergeLocalStyles(instance.id, preflight[tag]);
    }
  }

  const props: Prop[] = [];
  await Promise.all(
    fragment.props.map(async (prop) => {
      if (prop.name === "class" && prop.type === "string") {
        const { newClasses, parsedStyles } = await parseTailwindClasses(
          prop.value
        );
        if (parsedStyles.length > 0) {
          createOrMergeLocalStyles(prop.instanceId, parsedStyles);
          if (newClasses.length > 0) {
            props.push({ ...prop, value: newClasses });
          }
        }
        return;
      }
      props.push(prop);
    })
  );

  return {
    ...fragment,
    props,
    breakpoints,
    styleSources: Array.from(styleSources.values()),
    styleSourceSelections: Array.from(styleSourceSelections.values()),
    styles: Array.from(styles.values()),
  };
};
