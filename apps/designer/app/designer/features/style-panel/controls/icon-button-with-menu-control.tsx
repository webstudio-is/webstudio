import React from "react";
import { IconButtonWithMenu } from "@webstudio-is/design-system";
import { ComboboxControl } from "./combobox-control";
import { getFinalValue } from "../shared/get-final-value";
import { useIsFromCurrentBreakpoint } from "../shared/use-is-from-current-breakpoint";
import type { ControlProps } from "../style-sections";
import { iconConfigs } from "../shared/configs";

export const IconButtonWithMenuControl = ({
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

  const iconProps = iconConfigs[styleConfig.property];
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
