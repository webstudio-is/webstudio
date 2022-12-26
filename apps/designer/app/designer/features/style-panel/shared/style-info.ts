import type { Style, StyleProperty, StyleValue } from "@webstudio-is/css-data";
import { useMemo } from "react";

export type StylePropertyInfo = {
  source: "local" | "external";
  value: StyleValue;
};

export type StyleInfo = {
  [property in StyleProperty]?: StylePropertyInfo;
};

export const useStyleInfo = ({
  breakpointStyle,
  browserStyle,
}: {
  breakpointStyle: Style;
  browserStyle: Style;
}) => {
  const styleInfoData = useMemo(() => {
    const styleInfoData: StyleInfo = {};
    for (const [property, value] of Object.entries(browserStyle)) {
      styleInfoData[property as StyleProperty] = {
        source: "external",
        value,
      };
    }
    for (const [property, value] of Object.entries(breakpointStyle)) {
      styleInfoData[property as StyleProperty] = {
        source: "local",
        value,
      };
    }
    return styleInfoData;
  }, [browserStyle, breakpointStyle]);

  return styleInfoData;
};
