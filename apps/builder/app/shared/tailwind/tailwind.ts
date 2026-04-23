import { createGenerator } from "@unocss/core";
import { presetWind4 } from "@unocss/preset-wind4";
import {
  camelCaseProperty,
  extractCssCustomProperties,
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
    // Skip condition-only breakpoints (e.g. dark mode prefers-color-scheme)
    // and combined min+max width breakpoints (e.g. md:max-xl:)
    // @todo support composite breakpoints by splitting into range-based breakpoints
    if (mediaQuery?.condition !== undefined) {
      continue;
    }
    if (
      mediaQuery?.minWidth !== undefined &&
      mediaQuery?.maxWidth !== undefined
    ) {
      continue;
    }
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
      presetWind4({
        // css variables are defined on the same element as styleDecl
        preflights: { theme: "on-demand", reset: false, property: false },
        // dark mode will be ignored by parser
        dark: "media",
      }),
    ],
  });
};

const percentToNumber = (value: string) => {
  const trimmed = value.trim();
  if (trimmed.endsWith("%") === false) {
    return trimmed;
  }
  const parsed = Number.parseFloat(trimmed.slice(0, -1));
  if (Number.isNaN(parsed)) {
    return trimmed;
  }
  return (parsed / 100).toString();
};

const appendAlphaToOklch = (oklch: string, alpha: string) => {
  const match = oklch.match(/^oklch\((.*)\)$/i);
  if (match === null) {
    return oklch;
  }
  return `oklch(${match[1]} / ${alpha})`;
};

const hexToRgb = (hex: string) => {
  const normalized =
    hex.length === 4
      ? `#${hex[1]}${hex[1]}${hex[2]}${hex[2]}${hex[3]}${hex[3]}`
      : hex;
  const r = Number.parseInt(normalized.slice(1, 3), 16);
  const g = Number.parseInt(normalized.slice(3, 5), 16);
  const b = Number.parseInt(normalized.slice(5, 7), 16);
  return `${r} ${g} ${b}`;
};

const normalizeWind4Css = (css: string, finalVars: Map<string, string>) => {
  // Wind4 emits rem media queries (e.g. 40rem). Convert to px so existing
  // breakpoint mapping code can keep working unchanged.
  let normalized = css.replace(
    /(min|max)-width:\s*(-?\d*\.?\d+)rem/g,
    (_match, range, rem) => {
      const px = Number.parseFloat(rem) * 16;
      return `${range}-width: ${px}px`;
    }
  );

  normalized = normalized.replace(
    /(min|max)-width:\s*calc\((-?\d*\.?\d+)rem\s*-\s*0\.1px\)/g,
    (_match, range, rem) => {
      const px = Number.parseFloat(rem) * 16 - 0.1;
      return `${range}-width: ${px}px`;
    }
  );

  // Inline tracked theme variables so parseCss can resolve computed values
  // like calc(var(--spacing) * 2) and var(--text-sm-fontSize).
  for (const [name, value] of finalVars.entries()) {
    normalized = normalized
      .replaceAll(`var(${name})`, value)
      .replaceAll(`var(${name},`, `var(${value},`);
  }

  // Wind4 uses a leading utility var fallback for typography.
  normalized = normalized.replace(
    /var\(--tw-leading,\s*([^\)]+)\)/g,
    (_match, fallback) => fallback.trim()
  );

  // Resolve wind4's color-mix based opacity pipeline into concrete colors that
  // parseCss can read as typed color values.
  normalized = normalized.replace(
    /color-mix\(in\s+(?:srgb|oklab),\s*var\((--colors-[\w-]+)\)\s+([^,]+),\s*transparent\)/g,
    (_match, colorVar: string, opacityExpr: string) => {
      const color = finalVars.get(colorVar);
      if (color === undefined) {
        return _match;
      }

      const trimmedOpacityExpr = opacityExpr.trim();
      let alpha = trimmedOpacityExpr;
      const varMatch = trimmedOpacityExpr.match(/^var\((--[\w-]+)\)$/);
      if (varMatch) {
        alpha = finalVars.get(varMatch[1]) ?? "1";
      }
      alpha = percentToNumber(alpha);

      if (alpha === "1") {
        return color;
      }
      if (color.startsWith("oklch(")) {
        return appendAlphaToOklch(color, alpha);
      }
      if (color.startsWith("#")) {
        return `rgb(from ${color} r g b / ${alpha})`;
      }
      return _match;
    }
  );

  // After variable inlining, remaining color-mix declarations may already have
  // concrete colors as the first argument (e.g. #fff or oklch(...)).
  normalized = normalized.replace(
    /color-mix\(in\s+(?:srgb|oklab),\s*(oklch\([^\)]+\)|#[0-9a-fA-F]{3,8})\s+([^,]+),\s*transparent\)/g,
    (_match, color: string, opacityExpr: string) => {
      const alpha = percentToNumber(opacityExpr.trim());
      if (alpha === "1") {
        return color;
      }
      if (color.startsWith("oklch(")) {
        return appendAlphaToOklch(color, alpha);
      }
      if (color.startsWith("#")) {
        return `rgb(from ${color} r g b / ${alpha})`;
      }
      return _match;
    }
  );

  normalized = normalized.replace(
    /rgb\(from\s+(#[0-9a-fA-F]{3,8})\s+r\s+g\s+b\s*\/\s*([^\)]+)\)/g,
    (_match, hex: string, alpha: string) => {
      const rgb = hexToRgb(hex);
      return `rgb(${rgb} / ${alpha.trim()})`;
    }
  );

  return normalized;
};

const isTailwindDefaultBorderColorStyle = (styleDecl: StyleDecl): boolean => {
  if (
    styleDecl.property.startsWith("border-") === false ||
    styleDecl.property.endsWith("-color") === false
  ) {
    return false;
  }

  const value = styleDecl.value as {
    type?: string;
    alpha?: number;
    components?: number[];
  };
  if (
    value?.type !== "color" ||
    value.alpha !== 1 ||
    Array.isArray(value.components) === false ||
    value.components.length < 3
  ) {
    return false;
  }

  const [r, g, b] = value.components;
  return (
    Math.abs(r - 229 / 255) < 0.001 &&
    Math.abs(g - 231 / 255) < 0.001 &&
    Math.abs(b - 235 / 255) < 0.001
  );
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
      // Tailwind v4 css variable shorthand: border-(--x)
      // UnoCSS doesn't parse this alias directly, so normalize it to
      // an explicit arbitrary property utility it understands.
      // TODO: remove workaround once fixed https://github.com/unocss/unocss/issues/5188
      if (/^border-\(--[\w-]+\)$/.test(item)) {
        const varName = item.slice("border-(".length, -1);
        return `[border-color:var(${varName})]`;
      }
      // Tailwind v4 typed arbitrary border color: border-[color:value]
      // UnoCSS wind4 incorrectly maps this to border-width. Rewrite to the
      // explicit arbitrary property form so it resolves to border-color.
      // TODO: remove workaround once fixed https://github.com/unocss/unocss/issues/5188
      const borderColorMatch = item.match(/^border-\[color:(.+)\]$/);
      if (borderColorMatch) {
        return `[border-color:${borderColorMatch[1]}]`;
      }
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
  // Normalize CSS custom property values: when the same var is declared in
  // multiple utility-class rules, replace every occurrence with the value from
  // the LAST declaration (the final cascaded value). This allows per-rule
  // two-pass pre-collection to see the correct final value regardless of which
  // rule a shorthand (e.g. border-color) lives in.
  const finalVars = extractCssCustomProperties(css);
  let normalizedCss = normalizeWind4Css(css, finalVars);
  if (finalVars.size > 0) {
    normalizedCss = normalizedCss.replace(/--[\w-]+\s*:[^;{}\n]*/g, (match) => {
      const colonIdx = match.indexOf(":");
      const propName = match.slice(0, colonIdx).trim();
      const finalValue = finalVars.get(propName);
      return finalValue !== undefined ? `${propName}: ${finalValue}` : match;
    });
  }
  let parsedStyles: StyleDecl[] = [];
  // @todo probably builtin in v4
  if (normalizedCss.includes("border")) {
    // Allow adding a border to an element by just adding a border-width. (https://github.com/tailwindcss/tailwindcss/pull/116)
    // [UnoCSS]: allow to override the default border color with css var `--un-default-border-color`
    const reset = `.styles {
      border-style: solid;
      border-color: var(--tw-default-border-color, #e5e7eb);
      border-width: 0;
    }`;
    parsedStyles.push(...parseCss(reset, new Map()).styles);
  }
  parsedStyles.push(...parseCss(normalizedCss, finalVars).styles);
  parsedStyles = parsedStyles.map((styleDecl) => {
    const value = styleDecl.value as {
      type?: string;
      unit?: string;
      value?: number | string;
      fallback?: { type?: string; value?: string };
    };

    const isOpacityProperty =
      styleDecl.property === "opacity" ||
      styleDecl.property.endsWith("opacity");
    if (
      isOpacityProperty &&
      value.type === "unit" &&
      value.unit === "%" &&
      typeof value.value === "number"
    ) {
      return {
        ...styleDecl,
        value: {
          type: "unit" as const,
          unit: "number" as const,
          value: value.value / 100,
        },
      };
    }

    if (value.type === "unparsed" && typeof value.value === "string") {
      const calcMatch = value.value.match(
        /^calc\((-?\d*\.?\d+)rem\*(-?\d*\.?\d+)\)$/
      );
      if (calcMatch) {
        return {
          ...styleDecl,
          value: {
            type: "unit",
            unit: "rem",
            value:
              Number.parseFloat(calcMatch[1]) * Number.parseFloat(calcMatch[2]),
          },
        };
      }
    }

    if (
      value.type === "var" &&
      value.value === "tw-leading" &&
      value.fallback?.type === "unparsed" &&
      typeof value.fallback.value === "string"
    ) {
      const fallbackMatch = value.fallback.value.match(/^(-?\d*\.?\d+)rem$/);
      if (fallbackMatch) {
        return {
          ...styleDecl,
          value: {
            type: "unit",
            unit: "rem",
            value: Number.parseFloat(fallbackMatch[1]),
          },
        };
      }
    }

    return styleDecl;
  });
  // skip preflights with ::before, ::after and ::backdrop
  parsedStyles = parsedStyles.filter(
    (styleDecl) =>
      !styleDecl.state?.startsWith("::") &&
      // Wind4 emits design-token variables in the theme layer. We inline them
      // into declarations above, so they don't need to be persisted as styles.
      (styleDecl.property.startsWith("--") === false ||
        styleDecl.property.startsWith("--tw-"))
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
    newStyles: StyleDecl[],
    { skipExisting = false }: { skipExisting?: boolean } = {}
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
      // preflight is a browser reset baseline and must not overwrite
      // explicit styles already set from inline style attributes
      if (skipExisting && styles.has(styleDeclKey)) {
        continue;
      }
      styles.delete(styleDeclKey);
      styles.set(styleDeclKey, styleDecl);
    }
  };

  for (const instance of fragment.instances) {
    const tag = instance.tag;
    if (tag && preflight[tag]) {
      createOrMergeLocalStyles(instance.id, preflight[tag], {
        skipExisting: true,
      });
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
          const localStyleSource = getLocalStyleSource(prop.instanceId);
          const filteredStyles = parsedStyles.filter((parsedStyleDecl) => {
            if (
              localStyleSource === undefined ||
              isTailwindDefaultBorderColorStyle(parsedStyleDecl) === false
            ) {
              return true;
            }

            const breakpointId = getBreakpointId(parsedStyleDecl.breakpoint);
            if (breakpointId === undefined) {
              return true;
            }

            const existingStyleKey = getStyleDeclKey({
              breakpointId,
              styleSourceId: localStyleSource.id,
              state: parsedStyleDecl.state,
              property: camelCaseProperty(parsedStyleDecl.property),
            });

            // Keep authored inline border colors if present.
            return styles.has(existingStyleKey) === false;
          });

          createOrMergeLocalStyles(prop.instanceId, filteredStyles);
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
