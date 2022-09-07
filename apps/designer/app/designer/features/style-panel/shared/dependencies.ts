import type { AppliesTo, StyleProperty } from "@webstudio-is/react-sdk";

const displayInline = [
  "inline",
  "inline-block",
  "inline-table",
  "inline-list-item",
  "inline-flex",
  "inline-grid",
];

type Dependencies = {
  [appliesTo in AppliesTo]?: {
    property: StyleProperty;
    values?: Array<string>;
    notValues?: Array<string>;
  };
};

// @todo many conditions apply based on element type,
// currently its wrong, because e.g. display: block is already defined on a div,
// but we expect it to be defined in currentStyle.
export const dependencies: Dependencies = {
  blockContainers: {
    property: "display",
    values: ["block"],
  },
  blockContainerElements: {
    property: "display",
    values: ["block"],
  },
  flexContainers: {
    property: "display",
    values: ["flex"],
  },
  // @todo this should actually check on parent
  flexItemsAndInFlowPseudos: {
    property: "display",
    values: ["flex"],
  },
  // @todo needs to also check flex-wrap
  multilineFlexContainers: {
    property: "flexWrap",
    values: ["wrap", "wrap-reverse"],
  },

  // Used by alignSelf
  // @todo needs to check parent to be display: flex or grid, position: absolute
  //flexItemsGridItemsAndAbsolutelyPositionedBoxes: {
  //  property: "display",
  //  values: ["flex", 'grid'],
  //},

  // Used by order
  // @todo Same thing as above
  //flexItemsGridItemsAbsolutelyPositionedContainerChildren: {
  //  property: "display",
  //  values: ["flex"],
  //},

  gridContainers: {
    property: "display",
    values: ["grid"],
  },
  gridItemsAndBoxesWithinGridContainer: {
    property: "display",
    values: ["grid"],
  },
  positionedElements: {
    property: "position",
    notValues: ["static"],
  },
  allElementsNoEffectIfDisplayNone: {
    property: "display",
    notValues: ["none"],
  },
  blockLevelElements: {
    property: "clear",
    values: ["block", "flex", "grid", "table"],
  },
  allElementsExceptTableDisplayTypes: {
    property: "display",
    notValues: ["table"],
  },
  allElementsExceptInternalTableDisplayTypes: {
    property: "display",
    notValues: [
      "table-row-group",
      "table-header-group",
      "table-footer-group",
      "table-row",
      "table-cell",
      "table-column-group",
      "table-column",
      "table-caption",
    ],
  },
  allElementsButNonReplacedAndTableColumns: {
    property: "display",
    notValues: ["table-column-group", "table-column"],
  },
  allElementsButNonReplacedAndTableRows: {
    property: "display",
    notValues: ["table-row-group", "table-row"],
  },
  blockContainersFlexContainersGridContainers: {
    property: "display",
    values: ["block", "flex", "grid"],
  },
  sameAsWidthAndHeight: {
    property: "display",
    notValues: [
      "table-column-group",
      "table-column",
      "table-row-group",
      "table-row",
    ],
  },
  nonReplacedInlineElements: {
    property: "display",
    values: displayInline,
  },
  inlineLevelAndTableCellElements: {
    property: "display",
    values: [...displayInline, "table-cell"],
  },
  absolutelyPositionedElements: {
    property: "position",
    values: ["absolute"],
  },
};
