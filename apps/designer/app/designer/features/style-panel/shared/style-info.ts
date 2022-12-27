import type { Style, StyleProperty, StyleValue } from "@webstudio-is/css-data";
import { useMemo } from "react";

export type StylePropertyInfo = {
  value: StyleValue;
  local?: StyleValue;
};

export type StyleInfo = {
  [property in StyleProperty]?: StylePropertyInfo;
};

export const useStyleInfo = ({
  localStyle,
  browserStyle,
}: {
  localStyle: Style;
  browserStyle: Style;
}) => {
  const styleInfoData = useMemo(() => {
    const styleInfoData: StyleInfo = {};
    for (const [property, value] of Object.entries(browserStyle)) {
      styleInfoData[property as StyleProperty] = {
        value,
      };
    }
    for (const [property, value] of Object.entries(localStyle)) {
      styleInfoData[property as StyleProperty] = {
        value,
        local: value,
      };
    }
    return styleInfoData;
  }, [browserStyle, localStyle]);

  return styleInfoData;
};
