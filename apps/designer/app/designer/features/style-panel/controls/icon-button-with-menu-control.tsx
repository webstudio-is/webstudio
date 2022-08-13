import React from "react";
import { IconButtonWithMenu } from "@webstudio-is/design-system";
import { ComboboxControl } from "./combobox-control";
import { getFinalValue } from "../shared/get-final-value";
import { useIsFromCurrentBreakpoint } from "../shared/use-is-from-current-breakpoint";
import type { ControlProps } from "../style-sections";
import {
  AlignContentStart,
  AlignContentEnd,
  AlignContentCenter,
  AlignContentStretch,
  AlignContentSpaceAround,
  AlignContentSpaceBetween,
  AlignItemsStart,
  AlignItemsEnd,
  AlignItemsCenter,
  AlignItemsBaseline,
  AlignItemsStretch,
  FlexDirectionRow,
  FlexDirectionColumn,
  FlexDirectionRowReverse,
  FlexDirectionColumnReverse,
  FlexWrapNowrap,
  FlexWrapWrap,
  FlexWrapWrapReverse,
  JustifyContentStart,
  JustifyContentEnd,
  JustifyContentCenter,
  JustifyContentSpaceBetween,
  JustifyContentSpaceAround,
  JustifyItemsStart,
  JustifyItemsEnd,
  JustifyItemsCenter,
  IconRecords,
} from "@webstudio-is/icons";

const icons: IconRecords = {
  alignContent: {
    normal: AlignContentStart,
    start: AlignContentStart,
    end: AlignContentEnd,
    center: AlignContentCenter,
    stretch: AlignContentStretch,
    "space-around": AlignContentSpaceAround,
    "space-between": AlignContentSpaceBetween,
  },
  alignItems: {
    normal: AlignItemsStart,
    start: AlignItemsStart,
    end: AlignItemsEnd,
    center: AlignItemsCenter,
    baseline: AlignItemsBaseline,
    stretch: AlignItemsStretch,
  },
  flexDirection: {
    normal: FlexDirectionRow,
    row: FlexDirectionRow,
    column: FlexDirectionColumn,
    "row-reverse": FlexDirectionRowReverse,
    "column-reverse": FlexDirectionColumnReverse,
  },
  flexWrap: {
    normal: FlexWrapNowrap,
    nowrap: FlexWrapNowrap,
    wrap: FlexWrapWrap,
    "wrap-reverse": FlexWrapWrapReverse,
  },
  justifyContent: {
    normal: JustifyContentStart,
    start: JustifyContentStart,
    end: JustifyContentEnd,
    center: JustifyContentCenter,
    "space-between": JustifyContentSpaceBetween,
    "space-around": JustifyContentSpaceAround,
  },
  justifyItems: {
    normal: JustifyItemsStart,
    start: JustifyItemsStart,
    end: JustifyItemsEnd,
    center: JustifyItemsCenter,
  },
};

const IconButtonWithMenuControl = ({
  currentStyle,
  inheritedStyle,
  setProperty,
  styleConfig,
  category,
}: ControlProps) => {
  const value = getFinalValue({
    currentStyle,
    inheritedStyle,
    property: styleConfig.property,
  });
  const isFromCurrentBreakpoint = useIsFromCurrentBreakpoint(
    styleConfig.property
  );

  if (value === undefined) return null;

  const setValue = setProperty(styleConfig.property);
  const currentValue = value.value as string;

  if (String(currentStyle.display?.value).includes("flex") !== true) {
    return (
      <ComboboxControl
        currentStyle={currentStyle}
        inheritedStyle={inheritedStyle}
        setProperty={setProperty}
        styleConfig={styleConfig}
        category={category}
      />
    );
  }

  const iconProps = icons[styleConfig.property];
  const iconStyle =
    styleConfig.property === "flexDirection"
      ? {}
      : {
          transform: `rotate(${
            currentStyle.flexDirection?.value === "column"
              ? 90 * (styleConfig.property === "alignItems" ? -1 : 1)
              : 0
          }deg)`,
        };
  const items = styleConfig.items
    .map((item) => {
      const ItemIcon = iconProps[item.name];
      return {
        ...item,
        icon: ItemIcon && <ItemIcon style={iconStyle} />,
      };
    })
    .filter((item) => item.icon);
  return (
    <IconButtonWithMenu
      label={styleConfig.label}
      items={items}
      value={String(currentValue)}
      onChange={setValue}
      isFromCurrentBreakpoint={isFromCurrentBreakpoint}
    ></IconButtonWithMenu>
  );
};

export { IconButtonWithMenuControl };
