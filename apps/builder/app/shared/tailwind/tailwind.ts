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
  type Breakpoint,
  type Instance,
  type Prop,
  type WebstudioFragment,
} from "@webstudio-is/sdk";
import { isBaseBreakpoint } from "../nano-states";
import { preflight } from "./__generated__/preflight";

// breakpoints used to map tailwind classes to webstudio breakpoints
// includes both min-width (desktop-first) and max-width (mobile-first) breakpoints
const tailwindBreakpoints: Breakpoint[] = [
  { id: "1920", label: "1920", minWidth: 1920 },
  { id: "1440", label: "1440", minWidth: 1440 },
  { id: "1280", label: "1280", minWidth: 1280 },
  { id: "base", label: "" },
  { id: "991", label: "991", maxWidth: 991 },
  { id: "767", label: "767", maxWidth: 767 },
  { id: "479", label: "479", maxWidth: 479 },
];

const tailwindToWebstudioMappings: Record<number, undefined | number> = {
  639.9: 479,
  640: 480,
  767.9: 767,
  1023.9: 991,
  1024: 992,
  1279.9: 1279,
  1535.9: 1439,
  1536: 1440,
};

type StyleDecl = Omit<ParsedStyleDecl, "selector">;

type StyleBreakpoint = {
  styleDecl: StyleDecl;
  minWidth?: number;
  maxWidth?: number;
};

type Range = {
  styleDecl: StyleDecl;
  start: number;
  end: number;
};

const serializeStyleBreakpoint = (breakpoint: StyleBreakpoint) => {
  if (breakpoint?.minWidth !== undefined) {
    return `(min-width: ${breakpoint.minWidth}px)`;
  }
  if (breakpoint?.maxWidth !== undefined) {
    return `(max-width: ${breakpoint.maxWidth}px)`;
  }
};

const UPPER_BOUND = Number.MAX_SAFE_INTEGER;

const breakpointsToRanges = (breakpoints: StyleBreakpoint[]) => {
  // collect lower bounds and ids
  const values = new Set<number>([0]);
  const styles = new Map<undefined | number, StyleDecl>();
  for (const breakpoint of breakpoints) {
    if (breakpoint.minWidth !== undefined) {
      values.add(breakpoint.minWidth);
      styles.set(breakpoint.minWidth, breakpoint.styleDecl);
    } else if (breakpoint.maxWidth !== undefined) {
      values.add(breakpoint.maxWidth + 1);
      styles.set(breakpoint.maxWidth, breakpoint.styleDecl);
    } else {
      // base breakpoint
      styles.set(undefined, breakpoint.styleDecl);
    }
  }
  const sortedValues = Array.from(values).sort((left, right) => left - right);
  const ranges: Range[] = [];
  for (let index = 0; index < sortedValues.length; index += 1) {
    const start = sortedValues[index];
    let end;
    if (index === sortedValues.length - 1) {
      end = UPPER_BOUND;
    } else {
      end = sortedValues[index + 1] - 1;
    }
    const styleDecl =
      styles.get(start) ?? styles.get(end) ?? styles.get(undefined);
    if (styleDecl) {
      ranges.push({ styleDecl, start, end });
      continue;
    }
    // when declaration is missing add new one with unset value
    // to fill the hole in breakpoints
    // for example
    // "sm:opacity-20" has a hole at the start
    // "max-sm:opacity-10 md:opacity-20" has a whole in the middle
    const example = Array.from(styles.values())[0];
    if (example) {
      const newStyleDecl: StyleDecl = {
        ...example,
        value: { type: "keyword", value: "unset" },
      };
      ranges.push({ styleDecl: newStyleDecl, start, end });
    }
  }
  return ranges;
};

const rangesToBreakpoints = (
  ranges: Range[],
  userBreakpoints: Breakpoint[]
) => {
  const breakpoints: StyleBreakpoint[] = [];
  for (const { styleDecl, start, end } of ranges) {
    let matchedBreakpoint;
    for (const breakpoint of userBreakpoints) {
      if (breakpoint.minWidth === start) {
        matchedBreakpoint = { styleDecl, minWidth: start };
      }
      if (breakpoint.maxWidth === end) {
        matchedBreakpoint = { styleDecl, maxWidth: end };
      }
      if (
        breakpoint.minWidth === undefined &&
        breakpoint.maxWidth === undefined
      ) {
        matchedBreakpoint ??= { styleDecl };
      }
    }
    if (matchedBreakpoint) {
      styleDecl.breakpoint = serializeStyleBreakpoint(matchedBreakpoint);
      breakpoints.push(matchedBreakpoint);
    }
  }
  return breakpoints;
};

const adaptBreakpoints = (
  parsedStyles: StyleDecl[],
  userBreakpoints: Breakpoint[]
) => {
  const breakpointGroups = new Map<string, StyleBreakpoint[]>();
  for (const styleDecl of parsedStyles) {
    const mediaQuery = styleDecl.breakpoint
      ? parseMediaQuery(styleDecl.breakpoint)
      : undefined;
    if (mediaQuery?.minWidth) {
      mediaQuery.minWidth =
        tailwindToWebstudioMappings[mediaQuery.minWidth] ?? mediaQuery.minWidth;
    }
    if (mediaQuery?.maxWidth) {
      mediaQuery.maxWidth =
        tailwindToWebstudioMappings[mediaQuery.maxWidth] ?? mediaQuery.maxWidth;
    }
    const groupKey = `${styleDecl.property}:${styleDecl.state ?? ""}`;
    let group = breakpointGroups.get(groupKey);
    if (group === undefined) {
      group = [];
      breakpointGroups.set(groupKey, group);
    }
    group.push({ styleDecl, ...mediaQuery });
  }
  const newStyles: typeof parsedStyles = [];
  for (const group of breakpointGroups.values()) {
    const ranges = breakpointsToRanges(group);
    const newGroup = rangesToBreakpoints(ranges, userBreakpoints);
    for (const { styleDecl } of newGroup) {
      newStyles.push(styleDecl);
    }
  }
  return newStyles;
};

const createUnoGenerator = async () => {
  return await createGenerator({
    presets: [
      presetWind3({
        // css variables are defined on the same element as styleDecl
        preflight: "on-demand",
        // dark mode will be ignored by parser
        dark: "media",
      }),
      // until we support oklch natively
      presetLegacyCompat({ legacyColorSpace: true }),
    ],
  });
};

const parseTailwindClasses = async (
  classes: string,
  userBreakpoints: Breakpoint[],
  fragmentBreakpoints: Breakpoint[]
) => {
  // avoid caching uno generator instance
  // to prevent bloating css with preflights from previous calls
  const generator = await createUnoGenerator();
  let hasColumnGaps = false;
  let hasRowGaps = false;
  let hasFlexOrGrid = false;
  let hasContainer = false;
  classes = classes
    .split(" ")
    .map((item) => {
      // styles data cannot express space-x and space-y selectors
      // with lobotomized owl so replace with gaps
      if (item.includes("space-x-")) {
        hasColumnGaps = true;
        return item.replace("space-x-", "gap-x-");
      }
      if (item.includes("space-y-")) {
        hasRowGaps = true;
        return item.replace("space-y-", "gap-y-");
      }
      hasFlexOrGrid ||= item.endsWith("flex") || item.endsWith("grid");
      hasContainer ||= item === "container";
      return item;
    })
    .join(" ");
  const generated = await generator.generate(classes);
  // use tailwind prefix instead of unocss one
  const css = generated.css.replaceAll("--un-", "--tw-");
  let parsedStyles: StyleDecl[] = [];
  // @todo probably builtin in v4
  if (css.includes("border")) {
    // Allow adding a border to an element by just adding a border-width. (https://github.com/tailwindcss/tailwindcss/pull/116)
    // [UnoCSS]: allow to override the default border color with css var `--un-default-border-color`
    const reset = `.styles {
      border-style: solid;
      border-color: var(--tw-default-border-color, #e5e7eb);
      border-width: 0;
    }`;
    parsedStyles.push(...parseCss(reset));
  }
  parsedStyles.push(...parseCss(css));
  // skip preflights with ::before, ::after and ::backdrop
  parsedStyles = parsedStyles.filter(
    (styleDecl) => !styleDecl.state?.startsWith("::")
  );
  // setup base breakpoint for container class to avoid hole in ranges
  if (hasContainer) {
    parsedStyles.unshift({
      property: "max-width",
      value: { type: "keyword", value: "none" },
    });
  }
  // gaps work only with flex and grid
  // so try to use one or another for different axes
  if (hasColumnGaps && !hasFlexOrGrid) {
    parsedStyles.unshift({
      property: "display",
      value: { type: "keyword", value: "flex" },
    });
  }
  if (hasRowGaps && !hasFlexOrGrid) {
    parsedStyles.unshift(
      {
        property: "display",
        value: { type: "keyword", value: "flex" },
      },
      {
        property: "flex-direction",
        value: { type: "keyword", value: "column" },
      },
      {
        property: "align-items",
        value: { type: "keyword", value: "start" },
      }
    );
  }
  parsedStyles = adaptBreakpoints(parsedStyles, userBreakpoints);
  // container class generates max-width styles for all Tailwind breakpoints
  // filter out min-width ones only if user doesn't have min-width breakpoints
  const hasUserMinWidthBreakpoints = fragmentBreakpoints.some(
    (bp) => bp.minWidth !== undefined
  );
  if (hasContainer && !hasUserMinWidthBreakpoints) {
    parsedStyles = parsedStyles.filter(
      (styleDecl) =>
        styleDecl.property !== "max-width" ||
        !styleDecl.breakpoint?.includes("min-width")
    );
  }
  const newClasses = classes
    .split(" ")
    .filter((item) => !generated.matched.has(item))
    .join(" ");
  return { newClasses, parsedStyles };
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
      styleSourceSelection = { instanceId, values: [] };
      styleSourceSelections.set(instanceId, styleSourceSelection);
    }
    styleSources.set(localStyleSource.id, localStyleSource);
    styleSourceSelection.values.push(localStyleSource.id);
    return localStyleSource;
  };
  const createOrMergeLocalStyles = (
    instanceId: Instance["id"],
    newStyles: StyleDecl[]
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
      const styleDeclKey = getStyleDeclKey(styleDecl);
      styles.delete(styleDeclKey);
      styles.set(styleDeclKey, styleDecl);
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
        // always use tailwindBreakpoints for parsing to support all Tailwind classes
        // new breakpoints will be created as needed via getBreakpointId
        const { newClasses, parsedStyles } = await parseTailwindClasses(
          prop.value,
          tailwindBreakpoints,
          fragment.breakpoints
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
