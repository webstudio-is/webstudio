import { useState } from "react";
import type { StyleProperty } from "@webstudio-is/css-data";
import {
  Button,
  Flex,
  Box,
  Text,
  Label,
  Tooltip,
  Popover,
  PopoverContent,
  PopoverPortal,
  PopoverTrigger,
  Separator,
} from "@webstudio-is/design-system";
import { UndoIcon } from "@webstudio-is/icons";
import { isFeatureEnabled } from "~/shared/feature-flags";
import { getStyleSource, StyleInfo } from "./style-info";

type PropertyNameProps = {
  style: StyleInfo;
  property: StyleProperty | StyleProperty[];
  label: string;
  onReset: () => void;
};

export const PropertyName = ({
  style: currentStyle,
  property,
  label,
  onReset,
}: PropertyNameProps) => {
  const properties = Array.isArray(property) ? property : [property];
  const styleSource = getStyleSource(
    ...properties.map((property) => currentStyle[property])
  );
  const [isOpen, setIsOpen] = useState(false);
  const isPopoverEnabled =
    isFeatureEnabled("propertyReset") && styleSource === "local";

  const labelElement = (
    <Label
      css={{
        fontWeight: "inherit",
        padding: "calc($spacing$3 / 2) $spacing$3",
        ...(styleSource === "local"
          ? {
              color: "$blue11",
              backgroundColor: "$colors$blue4",
              borderRadius: "$borderRadius$4",
            }
          : {
              color: "$hiContrast",
            }),
      }}
      htmlFor={property.toString()}
    >
      {label}
    </Label>
  );

  if (isPopoverEnabled) {
    return (
      <Flex align="center">
        <Popover modal open={isOpen} onOpenChange={setIsOpen}>
          <PopoverTrigger asChild aria-label="Show proprety description">
            {labelElement}
          </PopoverTrigger>
          <PopoverPortal>
            <PopoverContent align="start" onClick={() => setIsOpen(false)}>
              <Flex align="start" css={{ px: "$spacing$4", py: "$spacing$3" }}>
                <Button onClick={onReset}>
                  <UndoIcon /> &nbsp; Reset
                </Button>
              </Flex>
              <Separator />
              <Box css={{ px: "$spacing$4", py: "$spacing$3" }}>
                <Text color="hint">
                  Resetting will revert to initial or inherited value
                </Text>
              </Box>
            </PopoverContent>
          </PopoverPortal>
        </Popover>
      </Flex>
    );
  }

  return (
    <Flex align="center">
      <Tooltip
        content={label}
        delayDuration={600}
        disableHoverableContent={true}
      >
        {labelElement}
      </Tooltip>
    </Flex>
  );
};
