import * as csstree from "css-tree";
import { cssTryParseValue } from "../parse-css-value";

/**
 * Represents a single grid track.
 * Can be a simple value like "1fr", "100px", "auto"
 * or a complex value like "minmax(100px, 1fr)"
 */
export type GridTrack = {
  /** The raw CSS value of the track */
  value: string;
};

/**
 * Parse a grid-template-columns or grid-template-rows value into an array of tracks.
 *
 * Handles:
 * - Simple values: "1fr", "100px", "auto", "min-content", "max-content"
 * - Functions: "minmax(100px, 1fr)", "fit-content(200px)"
 * - Repeat: "repeat(3, 1fr)" -> expands to ["1fr", "1fr", "1fr"]
 * - Line names: "[header] 1fr [content] 2fr" -> ignores line names, returns ["1fr", "2fr"]
 *
 * @param value - The CSS value string for grid-template-columns/rows
 * @returns Array of track values, or empty array if value is "none" or invalid
 */
export const parseGridTemplateTrackList = (value: string): GridTrack[] => {
  if (!value || value === "none") {
    return [];
  }

  const ast = cssTryParseValue(value);
  if (ast === undefined || ast.type !== "Value") {
    return [];
  }

  const tracks: GridTrack[] = [];
  const children = ast.children.toArray();

  for (const node of children) {
    // Skip line names (bracketed identifiers like [header])
    if (node.type === "Brackets") {
      continue;
    }

    // Handle simple identifiers: auto, min-content, max-content
    if (node.type === "Identifier") {
      tracks.push({ value: node.name });
      continue;
    }

    // Handle dimensions: 100px, 1fr, 50%
    if (node.type === "Dimension") {
      tracks.push({ value: `${node.value}${node.unit}` });
      continue;
    }

    // Handle percentages
    if (node.type === "Percentage") {
      tracks.push({ value: `${node.value}%` });
      continue;
    }

    // Handle numbers (rare but valid)
    if (node.type === "Number") {
      tracks.push({ value: node.value });
      continue;
    }

    // Handle functions: minmax(), fit-content(), repeat()
    if (node.type === "Function") {
      if (node.name === "repeat") {
        // Expand repeat() function
        const repeatTracks = expandRepeat(node);
        tracks.push(...repeatTracks);
      } else {
        // For other functions (minmax, fit-content), keep as-is
        tracks.push({ value: csstree.generate(node) });
      }
      continue;
    }
  }

  return tracks;
};

/**
 * Expand a repeat() function into individual tracks.
 * e.g., repeat(3, 1fr) -> [{ value: "1fr" }, { value: "1fr" }, { value: "1fr" }]
 * e.g., repeat(2, 100px 1fr) -> [{ value: "100px" }, { value: "1fr" }, { value: "100px" }, { value: "1fr" }]
 *
 * Note: repeat(auto-fill, ...) and repeat(auto-fit, ...) cannot be expanded
 * and will return the original function as a single track.
 */
const expandRepeat = (node: csstree.FunctionNode): GridTrack[] => {
  const children = node.children.toArray();

  // First child should be the count (number or auto-fill/auto-fit)
  const countNode = children[0];

  // Handle auto-fill and auto-fit - cannot expand, return as single track
  if (countNode?.type === "Identifier") {
    if (countNode.name === "auto-fill" || countNode.name === "auto-fit") {
      return [{ value: csstree.generate(node) }];
    }
  }

  // Get the repeat count
  let count = 1;
  if (countNode?.type === "Number") {
    count = parseInt(countNode.value, 10);
    if (isNaN(count) || count < 1) {
      return [{ value: csstree.generate(node) }];
    }
  }

  // Find the comma separator and get track template after it
  const trackTemplateNodes: csstree.CssNode[] = [];
  let foundComma = false;
  for (const child of children) {
    if (child.type === "Operator" && child.value === ",") {
      foundComma = true;
      continue;
    }
    if (foundComma) {
      trackTemplateNodes.push(child);
    }
  }

  if (trackTemplateNodes.length === 0) {
    return [{ value: csstree.generate(node) }];
  }

  // Parse the track template
  const templateTracks: GridTrack[] = [];
  for (const templateNode of trackTemplateNodes) {
    // Skip line names
    if (templateNode.type === "Brackets") {
      continue;
    }

    if (templateNode.type === "Identifier") {
      templateTracks.push({ value: templateNode.name });
    } else if (templateNode.type === "Dimension") {
      templateTracks.push({
        value: `${templateNode.value}${templateNode.unit}`,
      });
    } else if (templateNode.type === "Percentage") {
      templateTracks.push({ value: `${templateNode.value}%` });
    } else if (templateNode.type === "Number") {
      templateTracks.push({ value: templateNode.value });
    } else if (templateNode.type === "Function") {
      templateTracks.push({ value: csstree.generate(templateNode) });
    }
  }

  // Expand the template by the count
  const expandedTracks: GridTrack[] = [];
  for (let i = 0; i < count; i++) {
    expandedTracks.push(...templateTracks);
  }

  return expandedTracks;
};

/**
 * Serialize an array of tracks back to a CSS value string.
 *
 * @param tracks - Array of track values
 * @returns CSS string like "1fr 100px auto" or "none" if empty
 */
export const serializeGridTemplateTrackList = (tracks: GridTrack[]): string => {
  if (tracks.length === 0) {
    return "none";
  }
  return tracks.map((track) => track.value).join(" ");
};

/**
 * Represents a minmax() function with min and max values.
 */
export type Minmax = {
  min: string;
  max: string;
};

/**
 * Parse a minmax() function value into its min and max parts.
 * Returns undefined if the value is not a valid minmax() function.
 *
 * @example
 * parseMinmax("minmax(100px, 1fr)") // { min: "100px", max: "1fr" }
 * parseMinmax("1fr") // undefined
 */
export const parseMinmax = (value: string): Minmax | undefined => {
  const ast = cssTryParseValue(value);
  if (ast === undefined || ast.type !== "Value") {
    return undefined;
  }

  const children = ast.children.toArray();
  if (children.length !== 1) {
    return undefined;
  }

  const node = children[0];
  if (node.type !== "Function" || node.name !== "minmax") {
    return undefined;
  }

  const args = node.children.toArray();
  // minmax has two arguments separated by a comma
  // Structure: [min-value, Operator(","), max-value]
  const values: string[] = [];
  for (const arg of args) {
    if (arg.type === "Operator" && arg.value === ",") {
      continue;
    }
    values.push(csstree.generate(arg));
  }

  if (values.length !== 2) {
    return undefined;
  }

  return { min: values[0], max: values[1] };
};

/**
 * Create a minmax() CSS value from min and max parts.
 *
 * @example
 * serializeMinmax({ min: "100px", max: "1fr" }) // "minmax(100px,1fr)"
 */
export const serializeMinmax = (minmax: Minmax): string => {
  return `minmax(${minmax.min},${minmax.max})`;
};

/**
 * Result of checking if a grid template value is supported by the visual editor.
 */
export type GridTemplateSupport =
  | { supported: true }
  | {
      supported: false;
      reason: string;
      type: "subgrid" | "masonry" | "line-names" | "auto-fill" | "auto-fit";
    };

/**
 * Check if a grid-template-columns or grid-template-rows value can be
 * represented and edited by the visual grid UI.
 *
 * Unsupported values:
 * - `subgrid` - requires dedicated UI
 * - `masonry` - experimental, not a track definition
 * - `repeat(auto-fill, ...)` / `repeat(auto-fit, ...)` - dynamic track count
 * - Line names like `[header]` - would be silently discarded on edit
 *
 * Note: CSS variables are supported - use computedValue which resolves them.
 *
 * @param value - The CSS value string for grid-template-columns/rows
 * @returns Object indicating if supported, with reason and type if not
 */
export const checkGridTemplateSupport = (
  value: string
): GridTemplateSupport => {
  if (!value || value === "none") {
    return { supported: true };
  }

  // Check for subgrid
  if (value.includes("subgrid")) {
    return {
      supported: false,
      type: "subgrid",
      reason: "Subgrid is not supported in the visual editor",
    };
  }

  // Check for masonry
  if (value.includes("masonry")) {
    return {
      supported: false,
      type: "masonry",
      reason: "Masonry layout is not supported in the visual editor",
    };
  }

  const ast = cssTryParseValue(value);
  if (ast === undefined || ast.type !== "Value") {
    return { supported: true }; // Let invalid values pass through
  }

  const children = ast.children.toArray();

  for (const node of children) {
    // Check for line names (bracketed identifiers)
    if (node.type === "Brackets") {
      return {
        supported: false,
        type: "line-names",
        reason: "Named grid lines are not supported in the visual editor",
      };
    }

    // Check for auto-fill/auto-fit in repeat()
    if (node.type === "Function" && node.name === "repeat") {
      const repeatChildren = node.children.toArray();
      const countNode = repeatChildren[0];
      if (countNode?.type === "Identifier") {
        if (countNode.name === "auto-fill") {
          return {
            supported: false,
            type: "auto-fill",
            reason: "Dynamic grid tracks (auto-fill) cannot be edited visually",
          };
        }
        if (countNode.name === "auto-fit") {
          return {
            supported: false,
            type: "auto-fit",
            reason: "Dynamic grid tracks (auto-fit) cannot be edited visually",
          };
        }
      }
    }
  }

  return { supported: true };
};

/**
 * Describes the mode of a grid axis (columns or rows).
 *
 * - "explicit": Regular explicit tracks (e.g., "1fr 2fr 100px")
 * - "auto-fill": Dynamic tracks via repeat(auto-fill, ...)
 * - "auto-fit": Dynamic tracks via repeat(auto-fit, ...)
 * - "auto": Single "auto" keyword - implicit tracks based on children
 * - "none": No explicit tracks defined
 * - "subgrid": Subgrid inherits tracks from parent
 * - "masonry": Experimental masonry layout
 * - "line-names": Has named grid lines like [header]
 */
export type GridAxisMode =
  | "explicit"
  | "auto-fill"
  | "auto-fit"
  | "auto"
  | "none"
  | "subgrid"
  | "masonry"
  | "line-names";

/**
 * Analyze a grid template value to determine its mode.
 *
 * @param value - The CSS value string for grid-template-columns/rows
 * @returns The axis mode describing the type of grid track definition
 *
 * @example
 * getGridAxisMode("1fr 2fr 100px") // "explicit"
 * getGridAxisMode("repeat(auto-fill, minmax(200px, 1fr))") // "auto-fill"
 * getGridAxisMode("none") // "none"
 * getGridAxisMode("auto") // "auto"
 * getGridAxisMode("subgrid") // "subgrid"
 */
export const getGridAxisMode = (value: string): GridAxisMode => {
  if (!value || value === "none" || value === "") {
    return "none";
  }

  if (value === "auto") {
    return "auto";
  }

  if (value.includes("subgrid")) {
    return "subgrid";
  }

  if (value.includes("masonry")) {
    return "masonry";
  }

  const support = checkGridTemplateSupport(value);
  if (!support.supported) {
    // Map the unsupported type directly to mode
    return support.type;
  }

  return "explicit";
};

/**
 * Check if a grid axis mode represents a dynamic/implicit grid that
 * requires DOM probing to determine actual track count.
 *
 * @param mode - The grid axis mode
 * @returns true if the mode requires DOM-based track counting
 */
export const isImplicitGridMode = (mode: GridAxisMode): boolean => {
  return (
    mode === "auto-fill" ||
    mode === "auto-fit" ||
    mode === "auto" ||
    mode === "none"
  );
};

/**
 * Check if a grid axis mode is editable in the visual grid UI.
 *
 * @param mode - The grid axis mode
 * @returns true if the mode can be edited visually
 */
export const isEditableGridMode = (mode: GridAxisMode): boolean => {
  return mode === "explicit" || mode === "none" || mode === "auto";
};

/**
 * Get a display label for a grid axis mode (for the grid generator).
 *
 * @param mode - The grid axis mode
 * @param trackCount - The actual track count (for explicit modes)
 * @returns Display string like "3", "auto-fit", "none"
 */
export const getGridAxisLabel = (
  mode: GridAxisMode,
  trackCount: number
): string => {
  switch (mode) {
    case "auto-fill":
      return "auto-fill";
    case "auto-fit":
      return "auto-fit";
    case "auto":
      return "auto";
    case "none":
      return "none";
    default:
      return String(trackCount);
  }
};
