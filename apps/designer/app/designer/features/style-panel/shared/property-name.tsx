import { useState } from "react";
import { isFeatureEnabled } from "@webstudio-is/feature-flags";
import type { StyleProperty } from "@webstudio-is/css-data";
import { toValue } from "@webstudio-is/css-engine";
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
import { utils } from "@webstudio-is/project";
import { useBreakpoints, useRootInstance } from "~/shared/nano-states";
import { type StyleInfo, type StyleSource, getStyleSource } from "./style-info";
import { theme } from "@webstudio-is/design-system";

const PropertyPopoverContent = ({
  properties,
  style,
  styleSource,
  onReset,
}: {
  properties: StyleProperty[];
  style: StyleInfo;
  styleSource: StyleSource;
  onReset: () => void;
}) => {
  const [breakpoints] = useBreakpoints();
  const [rootInstance] = useRootInstance();

  if (styleSource === "local") {
    return (
      <>
        <Flex
          align="start"
          css={{ px: theme.spacing[4], py: theme.spacing[3] }}
        >
          <Button onClick={onReset} prefix={<UndoIcon />}>
            Reset
          </Button>
        </Flex>
        <Separator />
        <Box css={{ px: theme.spacing[4], py: theme.spacing[3] }}>
          {properties.map((property) => {
            const styleValueInfo = style[property];

            if (styleValueInfo?.cascaded) {
              const { value, breakpointId } = styleValueInfo.cascaded;
              const breakpoint = breakpoints.find(
                (item) => item.id === breakpointId
              );
              return (
                <Text key={property} color="hint">
                  Resetting will change {property} to cascaded {toValue(value)}{" "}
                  from {breakpoint?.label}
                </Text>
              );
            }

            if (styleValueInfo?.inherited) {
              const { value, instanceId } = styleValueInfo.inherited;
              const instance =
                rootInstance === undefined
                  ? undefined
                  : utils.tree.findInstanceById(rootInstance, instanceId);
              return (
                <Text key={property} color="hint">
                  Resetting will change {property} to inherited {toValue(value)}{" "}
                  from {instance?.component}
                </Text>
              );
            }

            return (
              <Text key={property} color="hint">
                Resetting will change to initial value
              </Text>
            );
          })}
        </Box>
      </>
    );
  }

  return (
    <Box css={{ px: theme.spacing[4], py: theme.spacing[3] }}>
      {properties.map((property) => {
        const styleValueInfo = style[property];

        if (styleValueInfo?.cascaded) {
          const { breakpointId } = styleValueInfo.cascaded;
          const breakpoint = breakpoints.find(
            (item) => item.id === breakpointId
          );
          return (
            <Text key={property} color="hint">
              {property} value is cascaded from {breakpoint?.label}
            </Text>
          );
        }

        if (styleValueInfo?.inherited) {
          const { instanceId } = styleValueInfo.inherited;
          const instance =
            rootInstance === undefined
              ? undefined
              : utils.tree.findInstanceById(rootInstance, instanceId);
          return (
            <Text key={property} color="hint">
              {property} value is inherited from {instance?.component}
            </Text>
          );
        }
      })}
    </Box>
  );
};

type PropertyNameProps = {
  style: StyleInfo;
  property: StyleProperty | StyleProperty[];
  label: string;
  onReset: () => void;
};

export const PropertyName = ({
  style,
  property,
  label,
  onReset,
}: PropertyNameProps) => {
  const properties = Array.isArray(property) ? property : [property];
  const styleSource = getStyleSource(
    ...properties.map((property) => style[property])
  );
  const [isOpen, setIsOpen] = useState(false);
  const isPopoverEnabled =
    isFeatureEnabled("propertyReset") &&
    (styleSource === "local" || styleSource === "remote");

  const labelElement = (
    <Label
      css={{
        fontWeight: "inherit",
        padding: `calc(${theme.spacing[3]} / 2) ${theme.spacing[3]}`,
        borderRadius: theme.borderRadius[4],
        ...(styleSource === "local" && {
          color: theme.colors.blue11,
          backgroundColor: theme.colors.blue4,
        }),
        ...(styleSource === "remote" && {
          color: theme.colors.orange11,
          backgroundColor: theme.colors.orange4,
        }),
        ...(styleSource === "preset" && {
          color: theme.colors.hiContrast,
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
              <PropertyPopoverContent
                properties={properties}
                style={style}
                styleSource={styleSource}
                onReset={onReset}
              />
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
