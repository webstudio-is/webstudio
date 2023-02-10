import { useState } from "react";
import { useStore } from "@nanostores/react";
import { isFeatureEnabled } from "@webstudio-is/feature-flags";
import type { StyleProperty } from "@webstudio-is/css-data";
import { toValue } from "@webstudio-is/css-engine";
import {
  theme,
  Button,
  Flex,
  Box,
  DeprecatedText2,
  Label,
  Tooltip,
  DeprecatedPopover,
  DeprecatedPopoverContent,
  DeprecatedPopoverPortal,
  DeprecatedPopoverTrigger,
  Separator,
} from "@webstudio-is/design-system";
import { UndoIcon } from "@webstudio-is/icons";
import { instancesIndexStore, useBreakpoints } from "~/shared/nano-states";
import { type StyleInfo, type StyleSource, getStyleSource } from "./style-info";

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
  const { instancesById } = useStore(instancesIndexStore);

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
                <DeprecatedText2 key={property} color="hint">
                  Resetting will change {property} to cascaded {toValue(value)}{" "}
                  from {breakpoint?.label}
                </DeprecatedText2>
              );
            }

            if (styleValueInfo?.inherited) {
              const { value, instanceId } = styleValueInfo.inherited;
              const instance = instancesById.get(instanceId);
              return (
                <DeprecatedText2 key={property} color="hint">
                  Resetting will change {property} to inherited {toValue(value)}{" "}
                  from {instance?.component}
                </DeprecatedText2>
              );
            }

            return (
              <DeprecatedText2 key={property} color="hint">
                Resetting will change to initial value
              </DeprecatedText2>
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
            <DeprecatedText2 key={property} color="hint">
              {property} value is cascaded from {breakpoint?.label}
            </DeprecatedText2>
          );
        }

        if (styleValueInfo?.inherited) {
          const { instanceId } = styleValueInfo.inherited;
          const instance = instancesById.get(instanceId);
          return (
            <DeprecatedText2 key={property} color="hint">
              {property} value is inherited from {instance?.component}
            </DeprecatedText2>
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

  const labelElement = <Label color={styleSource}>{label}</Label>;

  if (isPopoverEnabled) {
    return (
      <Flex align="center">
        <DeprecatedPopover modal open={isOpen} onOpenChange={setIsOpen}>
          <DeprecatedPopoverTrigger
            asChild
            aria-label="Show proprety description"
          >
            {labelElement}
          </DeprecatedPopoverTrigger>
          <DeprecatedPopoverPortal>
            <DeprecatedPopoverContent
              align="start"
              onClick={() => setIsOpen(false)}
            >
              <PropertyPopoverContent
                properties={properties}
                style={style}
                styleSource={styleSource}
                onReset={onReset}
              />
            </DeprecatedPopoverContent>
          </DeprecatedPopoverPortal>
        </DeprecatedPopover>
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
