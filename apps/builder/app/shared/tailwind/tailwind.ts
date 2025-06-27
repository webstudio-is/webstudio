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

const availableBreakpoints = [
  { id: "1920", minWidth: 1920 },
  { id: "1440", minWidth: 1440 },
  { id: "1280", minWidth: 1280 },
  { id: "base" },
  { id: "991", maxWidth: 991 },
  { id: "767", maxWidth: 767 },
  { id: "479", maxWidth: 479 },
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

type Breakpoint = {
  key: string;
  minWidth?: number;
  maxWidth?: number;
};

type Range = {
  key: string;
  start: number;
  end: number;
};

const serializeBreakpoint = (breakpoint: Breakpoint) => {
  if (breakpoint?.minWidth) {
    return `(min-width: ${breakpoint.minWidth}px)`;
  }
  if (breakpoint?.maxWidth) {
    return `(max-width: ${breakpoint.maxWidth}px)`;
  }
};

const UPPER_BOUND = Number.MAX_SAFE_INTEGER;

const breakpointsToRanges = (breakpoints: Breakpoint[]) => {
  // collect lower bounds and ids
  const values = new Set<number>([0]);
  const keys = new Map<undefined | number, string>();
  for (const breakpoint of breakpoints) {
    if (breakpoint.minWidth !== undefined) {
      values.add(breakpoint.minWidth);
      keys.set(breakpoint.minWidth, breakpoint.key);
    } else if (breakpoint.maxWidth !== undefined) {
      values.add(breakpoint.maxWidth + 1);
      keys.set(breakpoint.maxWidth, breakpoint.key);
    } else {
      // base breakpoint
      keys.set(undefined, breakpoint.key);
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
    const key = keys.get(start) ?? keys.get(end) ?? keys.get(undefined);
    if (key) {
      ranges.push({ key, start, end });
    }
  }
  return ranges;
};

const rangesToBreakpoints = (ranges: Range[]) => {
  const breakpoints: Breakpoint[] = [];
  for (const range of ranges) {
    let matchedBreakpoint;
    for (const breakpoint of availableBreakpoints) {
      if (breakpoint.minWidth === range.start) {
        matchedBreakpoint = { key: range.key, minWidth: range.start };
      }
      if (breakpoint.maxWidth === range.end) {
        matchedBreakpoint = { key: range.key, maxWidth: range.end };
      }
      if (
        breakpoint.minWidth === undefined &&
        breakpoint.maxWidth === undefined
      ) {
        matchedBreakpoint ??= { key: range.key };
      }
    }
    if (matchedBreakpoint) {
      breakpoints.push(matchedBreakpoint);
    }
  }
  return breakpoints;
};

const adaptBreakpoints = (
  parsedStyles: Omit<ParsedStyleDecl, "selector">[]
) => {
  const newStyles: typeof parsedStyles = [];
  const breakpointGroups = new Map<string, Breakpoint[]>();
  for (const styleDecl of parsedStyles) {
    newStyles.push(styleDecl);
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
    const styleDeclKey = `${styleDecl.breakpoint ?? ""}:${styleDecl.property}:${styleDecl.state ?? ""}`;
    group.push({ key: styleDeclKey, ...mediaQuery });
  }
  const breakpointsByKey = new Map<string, Breakpoint>();
  for (let group of breakpointGroups.values()) {
    const ranges = breakpointsToRanges(group);
    // adapt breakpoints only when first range is defined
    // for example opacity-10 sm:opacity-20 will work
    // but sm:opacity-20 alone does not have the base to switch to
    if (ranges[0].start === 0) {
      group = rangesToBreakpoints(ranges);
    }
    for (const breakpoint of group) {
      breakpointsByKey.set(breakpoint.key, breakpoint);
    }
  }
  for (const styleDecl of newStyles) {
    const styleDeclKey = `${styleDecl.breakpoint ?? ""}:${styleDecl.property}:${styleDecl.state ?? ""}`;
    const breakpoint = breakpointsByKey.get(styleDeclKey);
    if (breakpoint) {
      styleDecl.breakpoint = serializeBreakpoint(breakpoint);
    }
  }
  return newStyles;
};

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
  let hasColumnGaps = false;
  let hasRowGaps = false;
  let hasFlexOrGrid = false;
  let hasContainer = false;
  classes = classes
    .split(" ")
    .map((item) => {
      // styles data cannot express space-x and space-y selectors
      // with lobotomized owl so replace with gaps
      const spaceX = "space-x-";
      if (item.startsWith(spaceX)) {
        hasColumnGaps = true;
        return `gap-x-${item.slice(spaceX.length)}`;
      }
      const spaceY = "space-y-";
      if (item.startsWith(spaceY)) {
        hasRowGaps = true;
        return `gap-y-${item.slice(spaceY.length)}`;
      }
      hasFlexOrGrid ||= item.endsWith("flex") || item.endsWith("grid");
      hasContainer ||= item === "container";
      return item;
    })
    .join(" ");
  const generated = await generator.generate(classes);
  // use tailwind prefix instead of unocss one
  const css = generated.css.replaceAll("--un-", "--tw-");
  let parsedStyles: Omit<ParsedStyleDecl, "selector">[] = [];
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
  // setup base breakpoint for container class
  // to avoid hole in ranges
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
  adaptBreakpoints(parsedStyles);
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
