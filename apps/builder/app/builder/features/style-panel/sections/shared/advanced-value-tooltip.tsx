import { Box, Tooltip } from "@webstudio-is/design-system";
import type { ReactNode } from "react";
import { TooltipContent } from "../../shared/property-name";
import { toKebabCase, toPascalCase } from "../../shared/keyword-utils";
import { declarationDescriptions } from "@webstudio-is/css-data";
import type { StyleProperty } from "@webstudio-is/css-engine";
import type { StyleInfo } from "../../shared/style-info";
import type { DeleteProperty } from "../../shared/use-style-data";

// Visual controls can't represent all CSS values and in that case we show it in the Advanced section.
export const AdvancedValueTooltip = ({
  isAdvanced,
  children,
  property,
  value,
  currentStyle,
  deleteProperty,
}: {
  isAdvanced?: boolean;
  children: ReactNode;
  property: StyleProperty;
  value: string;
  currentStyle: StyleInfo;
  deleteProperty: DeleteProperty;
}) => {
  if (isAdvanced) {
    const content = (
      <TooltipContent
        scrollableContent={`${toKebabCase(property)}: ${value};`}
        description={
          declarationDescriptions[
            `${property}:${value}` as keyof typeof declarationDescriptions
          ]
        }
        title={toPascalCase(toKebabCase(property))}
        properties={[property]}
        style={currentStyle}
        onReset={() => {
          deleteProperty(property);
        }}
      />
    );
    //"The value is defined in the Advanced section."
    return (
      <Tooltip content={content}>
        <Box>{children}</Box>
      </Tooltip>
    );
  }
  return children;
};
