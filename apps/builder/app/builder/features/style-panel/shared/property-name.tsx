import { useState, type ReactElement } from "react";
import { useStore } from "@nanostores/react";
import type { StyleProperty } from "@webstudio-is/css-data";
import { toValue } from "@webstudio-is/css-engine";
import {
  theme,
  rawTheme,
  Button,
  Flex,
  Box,
  Label,
  Tooltip,
  Separator,
  Popover,
  PopoverTrigger,
  PopoverPortal,
  PopoverContent,
  Text,
} from "@webstudio-is/design-system";
import { AlertIcon, UndoIcon } from "@webstudio-is/icons";
import {
  breakpointsStore,
  instancesStore,
  styleSourcesStore,
} from "~/shared/nano-states";
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
  const breakpoints = useStore(breakpointsStore);
  const instances = useStore(instancesStore);
  const styleSources = useStore(styleSourcesStore);

  if (styleSource === "local") {
    return (
      <>
        <Flex
          align="start"
          css={{ px: theme.spacing[4], py: theme.spacing[3] }}
        >
          <Button onClick={() => onReset()} prefix={<UndoIcon />}>
            Reset
          </Button>
        </Flex>
        <Separator />
        <Box
          css={{
            px: theme.spacing[4],
            py: theme.spacing[3],
            // @todo this info looks undone, limit width as a fast fix for huge text like in backgrounds
            maxWidth: theme.spacing[30],
          }}
        >
          {properties.map((property) => {
            const styleValueInfo = style[property];

            if (styleValueInfo?.nextSource) {
              const { value, styleSourceId } = styleValueInfo.nextSource;
              const styleSource = styleSources.get(styleSourceId);
              let name: undefined | string = undefined;
              if (styleSource?.type === "local") {
                name = "local style source";
              }
              if (styleSource?.type === "token") {
                name = `"${styleSource.name}" token`;
              }
              return (
                <Text key={property} color="subtle">
                  The value of {property} is overriden by {toValue(value)} from{" "}
                  {name}
                </Text>
              );
            }

            if (styleValueInfo?.previousSource) {
              const { value, styleSourceId } = styleValueInfo.previousSource;
              const styleSource = styleSources.get(styleSourceId);
              let name: undefined | string = undefined;
              if (styleSource?.type === "local") {
                name = "local style source";
              }
              if (styleSource?.type === "token") {
                name = `"${styleSource.name}" token`;
              }
              return (
                <Text key={property} color="subtle">
                  Resetting will change {property} value to {toValue(value)}{" "}
                  from {name}
                </Text>
              );
            }

            if (styleValueInfo?.cascaded) {
              const { value, breakpointId } = styleValueInfo.cascaded;
              const breakpoint = breakpoints.get(breakpointId);
              return (
                <Text key={property} color="subtle">
                  Resetting will change {property} to cascaded {toValue(value)}{" "}
                  from {breakpoint?.label}
                </Text>
              );
            }

            if (styleValueInfo?.inherited) {
              const { value, instanceId } = styleValueInfo.inherited;
              const instance = instances.get(instanceId);
              return (
                <Text key={property} color="subtle">
                  Resetting will change {property} to inherited {toValue(value)}{" "}
                  from {instance?.component}
                </Text>
              );
            }

            return (
              <Text key={property} color="subtle">
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
        const source =
          styleValueInfo?.nextSource ?? styleValueInfo?.previousSource;

        if (source) {
          const { styleSourceId } = source;
          const styleSource = styleSources.get(styleSourceId);
          let name: undefined | string = undefined;
          if (styleSource?.type === "local") {
            name = "local style source";
          }
          if (styleSource?.type === "token") {
            name = `"${styleSource.name}" token`;
          }
          return (
            <Text key={property} color="subtle">
              {property} value is defined in {name}
            </Text>
          );
        }

        if (styleValueInfo?.cascaded) {
          const { breakpointId } = styleValueInfo.cascaded;
          const breakpoint = breakpoints.get(breakpointId);
          return (
            <Text key={property} color="subtle">
              {property} value is cascaded from {breakpoint?.label}
            </Text>
          );
        }

        if (styleValueInfo?.inherited) {
          const { instanceId } = styleValueInfo.inherited;
          const instance = instances.get(instanceId);
          return (
            <Text key={property} color="subtle">
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
  property: StyleProperty | readonly StyleProperty[];
  label: string | ReactElement;
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
  const isPopoverEnabled = styleSource === "local" || styleSource === "remote";

  const hasStyleSourceConflict = properties.some((property) => {
    const info = style[property];
    return info?.nextSource && info.local;
  });

  const labelElement = (
    <Flex shrink gap={1}>
      {typeof label === "string" ? (
        <Label color={styleSource} truncate>
          {label}
        </Label>
      ) : (
        label
      )}
      {hasStyleSourceConflict && (
        <AlertIcon fill={rawTheme.colors.foregroundDestructive} />
      )}
    </Flex>
  );

  if (isPopoverEnabled) {
    return (
      <Flex align="center">
        <Popover modal open={isOpen} onOpenChange={setIsOpen}>
          <PopoverTrigger
            asChild
            aria-label="Show proprety description"
            onClick={(event) => {
              event.preventDefault();
              if (event.altKey) {
                onReset();
                return;
              }
              setIsOpen(true);
            }}
          >
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
      {typeof label === "string" ? (
        <Tooltip
          content={label}
          delayDuration={600}
          disableHoverableContent={true}
        >
          {labelElement}
        </Tooltip>
      ) : (
        // It's on purpose to not wrap labelElement in Tooltip,
        // it can be a complex element with its own tooltip or no tooltip at all like SectionTitle
        labelElement
      )}
    </Flex>
  );
};
