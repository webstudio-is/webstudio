import type { ReactNode } from "react";
import { Box, Flex, Tooltip, rawTheme } from "@webstudio-is/design-system";
import { AlertIcon } from "@webstudio-is/icons";
import { declarationDescriptions } from "@webstudio-is/css-data";
import type { StyleProperty } from "@webstudio-is/css-engine";
import { TooltipContent } from "../shared/property-name";
import { toKebabCase, toPascalCase } from "../shared/keyword-utils";
import type { StyleInfo } from "../shared/style-info";
import type { DeleteProperty } from "../shared/use-style-data";

// Visual controls can't represent all CSS values and in that case we show it in the Advanced section.
export const AdvancedValueTooltip = ({
  isAdvanced = false,
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
  if (isAdvanced === false) {
    return children;
  }
  const content = (
    <TooltipContent
      scrollableContent={`${toKebabCase(property)}: ${value};`}
      description={
        <Flex gap="2" direction="column">
          {
            declarationDescriptions[
              `${property}:${value}` as keyof typeof declarationDescriptions
            ]
          }
          <Flex gap="1">
            <AlertIcon color={rawTheme.colors.backgroundAlertMain} /> This value
            was defined in the Advanced section.
          </Flex>
        </Flex>
      }
      title={toPascalCase(toKebabCase(property))}
      properties={[property]}
      style={currentStyle}
      onReset={() => {
        deleteProperty(property);
      }}
    />
  );
  return (
    <Tooltip content={content}>
      <Box>{children}</Box>
    </Tooltip>
  );
};
